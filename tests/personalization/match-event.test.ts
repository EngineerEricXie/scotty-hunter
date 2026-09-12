import { describe, expect, it } from "vitest";
import { extractFoodMetadata } from "@/lib/extraction/classify-food";
import { dietaryCompatibility } from "@/lib/personalization/dietary-compatibility";
import { withEventDefaults } from "@/lib/personalization/event-fields";
import { matchEvent } from "@/lib/personalization/match-event";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";
import { zonedWallTimeToIso } from "@/lib/timezone";
import type { Event, MealType, PlannerRequest } from "@/lib/types";

function event(partial: Partial<Event> & Pick<Event, "id" | "title" | "start_time">): Event {
  return withEventDefaults({
    building_id: "ghc",
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.95,
    food_evidence: "Lunch will be provided.",
    location_confidence: 1,
    end_time: zonedWallTimeToIso(2026, 9, 12, 13, 0),
    ...partial,
  });
}

const baseRequest: PlannerRequest = {
  date: "2026-09-12",
  meals: ["lunch"],
  max_walking_minutes: 15,
  start_building_id: "ghc",
  include_likely: true,
  explicit_only: false,
  allow_expired_registration: false,
};

function scoreOf(target: Event, request: PlannerRequest = baseRequest) {
  const walk = walkingMinutesBetween(request.start_building_id, target.building_id);
  return matchEvent({
    event: target,
    meal: "lunch",
    walkingMinutes: walk,
    originBuildingId: request.start_building_id,
    previous: null,
    request,
  });
}

describe("personalization matching", () => {
  it("hard-rejects explicitly meat-only events for vegetarians", () => {
    const steak = event({
      id: "steak",
      title: "Faculty steak lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      dietary_tags: ["meat"],
      food_evidence: "Meat-only BBQ lunch.",
    });
    expect(dietaryCompatibility(steak, "vegetarian")).toBe("INCOMPATIBLE");
    const matched = scoreOf(steak, { ...baseRequest, dietary_constraints: ["vegetarian"] });
    expect(matched.hardConstraintPassed).toBe(false);
    expect(matched.rejectionReasons.join(" ")).toMatch(/incompatible/i);
  });

  it("does not claim vegetarian-compatible pizza without dietary language", () => {
    const pizza = event({
      id: "pizza",
      title: "Pizza talk",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      food_items: ["pizza"],
      food_types: ["pizza", "lunch"],
      food_evidence: "Pizza will be provided.",
    });
    expect(extractFoodMetadata("Pizza will be provided.").dietary_tags).not.toContain("vegetarian");
    expect(dietaryCompatibility(pizza, "vegetarian")).toBe("UNKNOWN");
    const matched = scoreOf(pizza, { ...baseRequest, dietary_constraints: ["vegetarian"] });
    expect(matched.hardConstraintPassed).toBe(true);
    expect(matched.warnings.join(" ")).toMatch(/dietary/i);
  });

  it("ranks pizza above sandwiches when the user likes pizza", () => {
    const pizza = event({
      id: "a",
      title: "Pizza",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      food_items: ["pizza"],
      food_types: ["pizza", "lunch"],
    });
    const sandwiches = event({
      id: "b",
      title: "Sandwiches",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      food_items: ["sandwiches"],
      food_types: ["lunch"],
    });
    const request = { ...baseRequest, favorite_foods: ["pizza"] };
    expect(scoreOf(pizza, request).totalScore).toBeGreaterThan(scoreOf(sandwiches, request).totalScore);
  });

  it("rejects events beyond the max walking time", () => {
    const far = event({
      id: "far",
      title: "Far lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      building_id: "craig",
    });
    const walk = walkingMinutesBetween("ghc", "craig");
    expect(walk).toBeGreaterThan(10);
    const matched = matchEvent({
      event: far,
      meal: "lunch",
      walkingMinutes: walk,
      originBuildingId: "ghc",
      previous: null,
      request: { ...baseRequest, max_walking_minutes: 10 },
    });
    expect(matched.hardConstraintPassed).toBe(false);
    expect(matched.rejectionReasons.join(" ")).toMatch(/walking/i);
  });

  it("excludes RSVP-required events when willing_to_rsvp is no", () => {
    const rsvp = event({
      id: "rsvp",
      title: "RSVP lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      registration_required: true,
      registration_status: "REQUIRED",
    });
    const open = event({
      id: "open",
      title: "Open lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      building_id: "cuc",
    });
    const request = { ...baseRequest, willing_to_rsvp: "no" as const };
    expect(scoreOf(rsvp, request).hardConstraintPassed).toBe(false);
    expect(scoreOf(open, request).hardConstraintPassed).toBe(true);
  });

  it("filters LIKELY events when explicit-only is set", () => {
    const likely = event({
      id: "likely",
      title: "Reception",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      food_status: "LIKELY",
      food_confidence: 0.7,
      food_evidence: "Refreshments will be served.",
    });
    const plan = buildItinerary([likely], {
      ...baseRequest,
      explicit_only: true,
      include_likely: false,
    });
    expect(plan.event_count).toBe(0);
  });

  it("ranks the closer event higher when quality is equal", () => {
    const near = event({
      id: "near",
      title: "Near",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      building_id: "ghc",
    });
    const farther = event({
      id: "farther",
      title: "Farther",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      building_id: "tepper",
    });
    expect(scoreOf(near).totalScore).toBeGreaterThan(scoreOf(farther).totalScore);
  });

  it("does not treat empty dietary tags as compatible", () => {
    const lunch = event({
      id: "plain",
      title: "Plain lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      dietary_tags: [],
      food_evidence: "Lunch will be provided.",
    });
    expect(dietaryCompatibility(lunch, "vegetarian")).toBe("UNKNOWN");
    expect(dietaryCompatibility(lunch, "vegetarian")).not.toBe("COMPATIBLE");
  });

  it("changes the itinerary when the vegetarian chip is toggled", () => {
    const steak = event({
      id: "steak",
      title: "Faculty steak lunch",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      dietary_tags: ["meat"],
      food_confidence: 1,
      food_evidence: "Meat-only BBQ lunch.",
    });
    const pizza = event({
      id: "pizza",
      title: "Vegetarian pizza",
      start_time: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      building_id: "cuc",
      food_items: ["pizza"],
      dietary_tags: ["vegetarian"],
      food_confidence: 0.9,
      food_evidence: "Vegetarian pizza will be provided.",
    });
    const open = buildItinerary([steak, pizza], baseRequest);
    const veg = buildItinerary([steak, pizza], {
      ...baseRequest,
      dietary_constraints: ["vegetarian"],
    });
    expect(open.events.map((item) => item.id)).toEqual(["steak"]);
    expect(veg.events.map((item) => item.id)).toEqual(["pizza"]);
  });

  it("drops a far event when max walking time is tightened", () => {
    const farDinner = event({
      id: "far-dinner",
      title: "Craig dinner",
      start_time: zonedWallTimeToIso(2026, 9, 12, 18, 0),
      end_time: zonedWallTimeToIso(2026, 9, 12, 19, 30),
      building_id: "craig",
      food_types: ["dinner"],
      food_evidence: "Dinner will be served.",
    });
    const request = { ...baseRequest, meals: ["dinner"] as MealType[] };
    const wide = buildItinerary([farDinner], { ...request, max_walking_minutes: 30 });
    const tight = buildItinerary([farDinner], { ...request, max_walking_minutes: 10 });
    expect(wide.event_count).toBe(1);
    expect(tight.event_count).toBe(0);
  });
});
