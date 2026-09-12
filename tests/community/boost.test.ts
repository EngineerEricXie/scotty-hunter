import { describe, expect, it } from "vitest";
import { withEventDefaults } from "@/lib/personalization/event-fields";
import { applyCorpusBoost, titleSimilarity, boostEvent } from "@/lib/community/boost";
import type { Event } from "@/lib/types";

function event(partial: Partial<Event> & Pick<Event, "id" | "title">): Event {
  return withEventDefaults({
    start_time: "2026-09-12T16:00:00.000Z",
    organizer: "HackCMU",
    venue_raw: "CUC",
    building_id: "cuc",
    location_confidence: 1,
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.7,
    food_evidence: "Lunch will be provided",
    ...partial,
  });
}

describe("similar wording boosts food probability", () => {
  it("scores overlapping titles", () => {
    expect(titleSimilarity("Saturday Lunch", "Saturday Dinner")).toBeGreaterThan(0.2);
    expect(titleSimilarity("HackCMU Saturday Lunch", "HackCMU Saturday Dinner")).toBeGreaterThan(
      0.45,
    );
  });

  it("raises confidence when a similar listing exists", () => {
    const lunch = event({ id: "a", title: "HackCMU Saturday Lunch", food_confidence: 0.7 });
    const dinner = event({
      id: "b",
      title: "HackCMU Saturday Dinner",
      food_confidence: 0.7,
      start_time: "2026-09-12T22:00:00.000Z",
    });
    const boosted = boostEvent(lunch, [lunch, dinner]);
    expect(boosted.confidence).toBeGreaterThan(lunch.food_confidence);
    expect(boosted.reasons.join(" ")).toMatch(/similar/i);
  });

  it("raises confidence further for NOW GOING pings", () => {
    const lunch = event({ id: "a", title: "Saturday Lunch", food_confidence: 0.7 });
    const result = boostEvent(lunch, [lunch], [
      {
        eventId: "a",
        title: "Saturday Lunch",
        buildingId: "cuc",
        at: new Date().toISOString(),
      },
    ]);
    expect(result.confidence).toBeGreaterThan(0.77);
    expect(result.reasons.join(" ")).toMatch(/NOW GOING/i);
  });

  it("does not boost NONE events", () => {
    const none = event({
      id: "n",
      title: "IFM Workshop",
      food_status: "NONE",
      food_confidence: 0,
    });
    const other = event({ id: "o", title: "IFM Workshop lunch", food_confidence: 0.9 });
    expect(boostEvent(none, [none, other]).boost).toBe(0);
  });

  it("applies boosts across a corpus", () => {
    const events = applyCorpusBoost([
      event({ id: "a", title: "HackCMU Saturday Lunch" }),
      event({
        id: "b",
        title: "HackCMU Saturday Dinner",
        start_time: "2026-09-12T22:00:00.000Z",
      }),
    ]);
    expect(events[0]?.base_confidence).toBe(0.7);
    expect(events[0]?.food_confidence ?? 0).toBeGreaterThan(0.7);
  });
});
