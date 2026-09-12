import { describe, expect, it } from "vitest";
import { withEventDefaults } from "@/lib/personalization/event-fields";
import type { Event } from "@/lib/types";
import { zonedWallTimeToIso } from "@/lib/timezone";
import { canAttend, eventsOverlap } from "@/lib/planner/conflicts";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { scoreEvent } from "@/lib/planner/score-event";

function event(partial: Partial<Event> & Pick<Event, "id" | "title" | "start_time">): Event {
  return withEventDefaults({
    building_id: "ghc",
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.98,
    food_evidence: "Lunch will be provided.",
    location_confidence: 1,
    ...partial,
  });
}

const lunch = event({
  id: "lunch",
  title: "Lunch",
  start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
  end_time: zonedWallTimeToIso(2026, 9, 12, 13, 0),
  building_id: "tepper",
  food_types: ["lunch"],
});

const dinner = event({
  id: "dinner",
  title: "Dinner",
  start_time: zonedWallTimeToIso(2026, 9, 12, 18, 0),
  end_time: zonedWallTimeToIso(2026, 9, 12, 19, 30),
  building_id: "cuc",
  food_types: ["dinner"],
  food_evidence: "Dinner will be served.",
});

describe("planner conflicts", () => {
  it("detects overlapping events", () => {
    const other = event({
      id: "overlap",
      title: "Overlap",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 15),
      end_time: zonedWallTimeToIso(2026, 9, 12, 13, 15),
    });
    expect(eventsOverlap(lunch, other)).toBe(true);
  });

  it("rejects insufficient walking time", () => {
    const far = event({
      id: "far",
      title: "Far",
      start_time: zonedWallTimeToIso(2026, 9, 12, 13, 5),
      end_time: zonedWallTimeToIso(2026, 9, 12, 14, 0),
      building_id: "craig",
    });
    const walk = walkingMinutesBetween("tepper", "craig");
    expect(canAttend(lunch, far, walk)).toBe(false);
  });

  it("allows back-to-back events in the same building", () => {
    const next = event({
      id: "same",
      title: "Same building",
      start_time: zonedWallTimeToIso(2026, 9, 12, 13, 5),
      end_time: zonedWallTimeToIso(2026, 9, 12, 14, 0),
      building_id: "tepper",
    });
    const walk = walkingMinutesBetween("tepper", "tepper");
    expect(canAttend(lunch, next, walk)).toBe(true);
  });

  it("rejects expired registration", () => {
    const rsvp = event({
      id: "rsvp",
      title: "RSVP lunch",
      start_time: zonedWallTimeToIso(2026, 9, 13, 12, 0),
      registration_required: true,
      registration_deadline: zonedWallTimeToIso(2026, 9, 11, 12, 0),
    });
    const now = new Date(zonedWallTimeToIso(2026, 9, 12, 10, 0));
    expect(canAttend(null, rsvp, 0, { now })).toBe(false);
  });

  it("applies an off-campus penalty", () => {
    const campus = scoreEvent({ event: dinner, meal: "dinner", walkingMinutes: 8 });
    const off = scoreEvent({
      event: {
        ...dinner,
        id: "off",
        building_id: "craig",
      },
      meal: "dinner",
      walkingMinutes: 8,
    });
    expect(campus - off).toBeCloseTo(15);
  });

  it("returns no lunch candidate note", () => {
    const plan = buildItinerary([dinner], {
      date: "2026-09-12",
      meals: ["lunch"],
      max_walking_minutes: 15,
      start_building_id: "ghc",
      include_likely: true,
      explicit_only: false,
      allow_expired_registration: false,
    });
    expect(plan.event_count).toBe(0);
    expect(plan.notes.join(" ")).toMatch(/lunch/i);
  });

  it("selects compatible lunch and dinner deterministically", () => {
    const plan = buildItinerary([lunch, dinner], {
      date: "2026-09-12",
      meals: ["lunch", "dinner"],
      max_walking_minutes: 20,
      start_building_id: "ghc",
      include_likely: true,
      explicit_only: false,
      allow_expired_registration: false,
    });
    expect(plan.event_count).toBe(2);
    expect(plan.events.map((item) => item.id)).toEqual(["lunch", "dinner"]);
    const again = buildItinerary([dinner, lunch], {
      date: "2026-09-12",
      meals: ["lunch", "dinner"],
      max_walking_minutes: 20,
      start_building_id: "ghc",
      include_likely: true,
      explicit_only: false,
      allow_expired_registration: false,
    });
    expect(again.events.map((item) => item.id)).toEqual(["lunch", "dinner"]);
  });
});
