import type { Event, Itinerary, ItineraryLeg, MealType, PlannerRequest } from "@/lib/types";
import { calendarDateInZone } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/config";
import { getBuilding } from "@/lib/maps/buildings";
import { inferMeal, mealMatchScore, scoreEvent } from "@/lib/planner/score-event";
import { canAttend, walkingMinutesForPair } from "@/lib/planner/conflicts";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";
import { formatTime } from "@/lib/timezone";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

function eventOnDate(event: Event, date: string): boolean {
  return calendarDateInZone(new Date(event.start_time), APP_TIMEZONE) === date;
}

function foodAllowed(event: Event, request: PlannerRequest): boolean {
  if (event.food_status === "NONE") return false;
  if (request.explicit_only) return event.food_status === "EXPLICIT";
  if (!request.include_likely) {
    return event.food_status === "EXPLICIT";
  }
  return event.food_status === "EXPLICIT" || event.food_status === "LIKELY";
}

function tieBreak(a: Event, b: Event): number {
  if (b.food_confidence !== a.food_confidence) {
    return b.food_confidence - a.food_confidence;
  }
  const t = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  if (t !== 0) return t;
  return a.title.localeCompare(b.title);
}

/**
 * Greedy constrained optimizer. For each requested meal, pick the highest
 * scoring feasible candidate given walking time, overlap, and RSVP rules.
 */
export function buildItinerary(
  events: Event[],
  request: PlannerRequest,
  now = new Date(),
): Itinerary {
  const notes: string[] = [];
  const selected: { event: Event; meal: MealType; score: number; walk: number }[] =
    [];

  const meals = MEAL_ORDER.filter((meal) => request.meals.includes(meal));
  const candidates = events
    .filter((event) => eventOnDate(event, request.date))
    .filter((event) => foodAllowed(event, request))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  for (const meal of meals) {
    const mealCandidates = candidates.filter((event) => mealMatchScore(event, meal) > 0);
    if (mealCandidates.length === 0) {
      notes.push(`No ${meal} candidates matched this date and food confidence.`);
      continue;
    }

    const previous = selected.at(-1)?.event ?? null;
    const originId = previous?.building_id ?? request.start_building_id;
    const scored = mealCandidates
      .map((event) => {
        const walk = previous
          ? walkingMinutesForPair(previous, event)
          : walkingMinutesBetween(originId, event.building_id);
        const score = scoreEvent({ event, meal, walkingMinutes: walk, now });
        return { event, score, walk };
      })
      .filter(({ event, walk }) => {
        if (walk > request.max_walking_minutes && event.building_id !== originId) {
          return false;
        }
        return canAttend(previous, event, walk, {
          allowExpiredRegistration: request.allow_expired_registration,
          now,
        });
      })
      .filter(({ event }) => !selected.some((item) => item.event.id === event.id))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return tieBreak(a.event, b.event);
      });

    const best = scored[0];
    if (!best) {
      const expired = mealCandidates.some(
        (event) =>
          event.registration_required &&
          event.registration_deadline &&
          new Date(event.registration_deadline).getTime() < now.getTime(),
      );
      notes.push(
        expired
          ? `No feasible ${meal}: remaining options have expired registration or walking conflicts.`
          : `No feasible ${meal} within ${request.max_walking_minutes} minutes of walking.`,
      );
      continue;
    }
    selected.push({ ...best, meal });
  }

  const items: ItineraryLeg[] = [];
  let cursorBuilding = request.start_building_id;
  let totalWalk = 0;

  for (const pick of selected) {
    const walk = walkingMinutesBetween(cursorBuilding, pick.event.building_id);
    totalWalk += cursorBuilding === pick.event.building_id ? 0 : walk;
    const start = new Date(pick.event.start_time);
    const leaveAt = new Date(start.getTime() - walk * 60_000).toISOString();
    const from = getBuilding(cursorBuilding);
    const to = getBuilding(pick.event.building_id);

    if (cursorBuilding !== pick.event.building_id) {
      items.push({
        kind: "leave",
        at: leaveAt,
        title: `Leave ${from?.short_name ?? "start"}`,
        subtitle: `Walk about ${walk} min to ${to?.short_name ?? "event"}`,
        walking_minutes: walk,
        from_building_id: cursorBuilding,
        to_building_id: pick.event.building_id ?? undefined,
      });
      items.push({
        kind: "walk",
        at: leaveAt,
        title: `Walk to ${to?.short_name ?? "event"}`,
        walking_minutes: walk,
        from_building_id: cursorBuilding,
        to_building_id: pick.event.building_id ?? undefined,
      });
    }

    items.push({
      kind: "event",
      at: pick.event.start_time,
      title: pick.event.title,
      subtitle: `${to?.short_name ?? pick.event.venue_raw ?? "Campus"}${pick.event.room ? ` ${pick.event.room}` : ""}`,
      event: pick.event,
      meal_type: pick.meal,
      walking_minutes: walk,
      score: pick.score,
    });

    cursorBuilding = pick.event.building_id ?? cursorBuilding;
  }

  const mealCount = selected.length;
  const estimated = mealCount > 0 ? mealCount * 12 : null;

  if (selected.length === 0) {
    notes.unshift("No itinerary could be built for these preferences.");
  }

  return {
    date: request.date,
    items: items.filter((item) => item.kind !== "walk"),
    events: selected.map((item) => item.event),
    meal_count: mealCount,
    event_count: selected.length,
    total_walking_minutes: totalWalk,
    estimated_savings_usd: estimated,
    savings_assumption:
      "Rough illustration only: $12 per free meal. Not a factual savings calculation.",
    notes,
  };
}

export function explainEventMeal(event: Event): string {
  const meal = inferMeal(event);
  const adjective =
    event.food_status === "EXPLICIT"
      ? "Confirmed"
      : event.food_status === "LIKELY"
        ? "Likely"
        : "Possible";
  return `${adjective} ${meal}`;
}

export function itineraryPlainSummary(plan: Itinerary): string {
  const meals = `${plan.meal_count} free meal${plan.meal_count === 1 ? "" : "s"}`;
  const walk = `${plan.total_walking_minutes} min walking`;
  const events = `${plan.event_count} event${plan.event_count === 1 ? "" : "s"}`;
  return `${meals} · ${walk} · ${events}`;
}

export function formatLeave(iso: string): string {
  return formatTime(iso);
}
