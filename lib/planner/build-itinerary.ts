import type {
  Event,
  Itinerary,
  ItineraryLeg,
  MealType,
  PlannerRequest,
} from "@/lib/types";
import { calendarDateInZone } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/config";
import { getBuilding } from "@/lib/maps/buildings";
import { inferMeal } from "@/lib/planner/score-event";
import { walkingMinutesForPair } from "@/lib/planner/conflicts";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";
import { campusWalkHint } from "@/lib/maps/campus-graph";
import { formatTime } from "@/lib/timezone";
import { matchEvent } from "@/lib/personalization/match-event";
import { requiredActionsForEvents } from "@/lib/planner/required-actions";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

function eventOnDate(event: Event, date: string): boolean {
  return calendarDateInZone(new Date(event.start_time), APP_TIMEZONE) === date;
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
 * Phase 1 hard filter → Phase 2 personalized score → Phase 3 greedy pick.
 */
export function buildItinerary(
  events: Event[],
  request: PlannerRequest,
  now = new Date(),
): Itinerary {
  const notes: string[] = [];
  const unmatched_meals: MealType[] = [];
  const selected: {
    event: Event;
    meal: MealType;
    score: number;
    walk: number;
    reasons: string[];
    warnings: string[];
  }[] = [];

  const meals = MEAL_ORDER.filter((meal) => request.meals.includes(meal));
  const candidates = events
    .filter((event) => eventOnDate(event, request.date))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  for (const meal of meals) {
    const previous = selected.at(-1)?.event ?? null;
    const originId = previous?.building_id ?? request.start_building_id;
    const scored = candidates
      .map((event) => {
        const walk = previous
          ? walkingMinutesForPair(previous, event)
          : walkingMinutesBetween(originId, event.building_id);
        const matched = matchEvent({
          event,
          meal,
          walkingMinutes: walk,
          originBuildingId: originId,
          previous,
          request,
          now,
        });
        return { event, walk, matched };
      })
      .filter(({ event }) => !selected.some((item) => item.event.id === event.id));

    const feasible = scored
      .filter(({ matched }) => matched.hardConstraintPassed)
      .sort((a, b) => {
        if (b.matched.totalScore !== a.matched.totalScore) {
          return b.matched.totalScore - a.matched.totalScore;
        }
        return tieBreak(a.event, b.event);
      });

    const best = feasible[0];
    if (!best) {
      unmatched_meals.push(meal);
      const rejected = scored.flatMap(({ matched }) => matched.rejectionReasons);
      if (rejected.some((reason) => /expired|deadline/i.test(reason))) {
        notes.push(`No reliable ${meal}: remaining options have expired registration or walking conflicts.`);
      } else if (rejected.some((reason) => /walking/i.test(reason))) {
        notes.push(`No feasible ${meal} within ${request.max_walking_minutes} minutes of walking.`);
      } else if (rejected.some((reason) => /incompatible/i.test(reason))) {
        notes.push(`No reliable ${meal}: remaining food is incompatible with your diet.`);
      } else {
        notes.push(`No ${meal} candidates matched this date and food confidence.`);
      }
      continue;
    }

    selected.push({
      event: best.event,
      meal,
      score: best.matched.totalScore,
      walk: best.walk,
      reasons: best.matched.positiveReasons,
      warnings: best.matched.warnings,
    });
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
      const viaNote = campusWalkHint(cursorBuilding, pick.event.building_id ?? "");
      items.push({
        kind: "leave",
        at: leaveAt,
        title: `Leave ${from?.short_name ?? "start"}`,
        subtitle: `Walk about ${walk} min to ${to?.short_name ?? "event"}${viaNote ? ` ${viaNote}` : ""}`,
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
      positive_reasons: pick.reasons,
      warnings: pick.warnings,
    });

    cursorBuilding = pick.event.building_id ?? cursorBuilding;
  }

  const mealCount = selected.length;
  const estimated = mealCount > 0 ? mealCount * 12 : null;

  if (selected.length === 0) {
    notes.unshift("No itinerary could be built for these preferences.");
  }
  for (const meal of unmatched_meals) {
    if (!notes.some((note) => note.toLowerCase().includes(meal))) {
      notes.push(`No reliable option for ${meal}.`);
    }
  }

  const planned = selected.map((item) => item.event);
  return {
    date: request.date,
    items,
    events: planned,
    meal_count: mealCount,
    event_count: selected.length,
    total_walking_minutes: totalWalk,
    estimated_savings_usd: estimated,
    savings_assumption:
      "Rough illustration only: $12 per free meal. Not a factual savings calculation.",
    notes,
    unmatched_meals,
    required_actions: requiredActionsForEvents(planned, request.date, now),
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
