import type { Event, PlannerRequest, WeekPlan } from "@/lib/types";
import { upcomingCampusDates, weekdayFromIso } from "@/lib/personalization/week";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { requiredActionsForEvents } from "@/lib/planner/required-actions";

export function buildWeekPlan(
  events: Event[],
  request: PlannerRequest,
  now = new Date(),
): WeekPlan {
  const dates = upcomingCampusDates(request.date, request.campus_days);
  const days = dates.map((date) => {
    const itinerary = buildItinerary(events, { ...request, date, mode: "day" }, now);
    return { date, weekday: weekdayFromIso(date), itinerary };
  });
  const plannedEvents = days.flatMap((day) => day.itinerary.events);
  const notes = days.flatMap((day) =>
    day.itinerary.unmatched_meals.map(
      (meal) => `${day.weekday}: no reliable ${meal} option`,
    ),
  );
  return {
    week_start: dates[0] ?? request.date,
    days,
    required_actions: requiredActionsForEvents(plannedEvents, request.date, now),
    notes,
  };
}
