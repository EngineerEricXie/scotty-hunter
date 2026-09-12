import { describe, expect, it } from "vitest";
import { withEventDefaults } from "@/lib/personalization/event-fields";
import {
  clusterEvents,
  clusterHourLabel,
  pickClusterRepresentative,
} from "@/lib/maps/cluster-events";
import { buildMealRoute, mealRouteDrawCoordinates, mealRouteLine } from "@/lib/maps/meal-route";
import type { Event } from "@/lib/types";

function event(partial: Partial<Event> & Pick<Event, "id" | "title" | "start_time">): Event {
  return withEventDefaults({
    organizer: "HackCMU",
    venue_raw: "CUC",
    building_id: "cuc",
    location_confidence: 1,
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.9,
    food_evidence: "Lunch will be provided",
    ...partial,
  });
}

describe("cluster overlapping map markers", () => {
  it("stacks events in the same building into one cluster with a count", () => {
    const lunch = event({
      id: "sat-lunch",
      title: "Saturday Lunch",
      start_time: "2026-09-12T16:00:00.000Z",
    });
    const dinner = event({
      id: "sat-dinner",
      title: "Saturday Dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      food_types: ["dinner"],
    });
    const clusters = clusterEvents([lunch, dinner]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.events.map((item) => item.id)).toEqual(["sat-lunch", "sat-dinner"]);
    expect(clusterHourLabel(clusters[0]!)).toBe("CUC");
  });

  it("keeps far buildings separate without a screen projector", () => {
    const pizza = event({
      id: "pizza",
      title: "RI pizza",
      start_time: "2026-09-12T16:15:00.000Z",
      building_id: "nsh",
    });
    const dinner = event({
      id: "dinner",
      title: "Saturday Dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      building_id: "cuc",
    });
    expect(clusterEvents([pizza, dinner])).toHaveLength(2);
  });

  it("merges nearby buildings when their pixels overlap", () => {
    const pizza = event({
      id: "pizza",
      title: "RI pizza",
      start_time: "2026-09-12T16:15:00.000Z",
      building_id: "nsh",
    });
    const dinner = event({
      id: "dinner",
      title: "Saturday Dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      building_id: "cuc",
    });
    const clusters = clusterEvents([pizza, dinner], () => ({ x: 10, y: 10 }));
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.events).toHaveLength(2);
    expect(clusterHourLabel(clusters[0]!)).toBe("NEAR");
  });

  it("prefers a planned event as the cluster face", () => {
    const breakfast = event({
      id: "breakfast",
      title: "Breakfast",
      start_time: "2026-09-12T12:30:00.000Z",
      food_types: ["breakfast"],
    });
    const dinner = event({
      id: "dinner",
      title: "Saturday Dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      food_types: ["dinner"],
    });
    const cluster = clusterEvents([breakfast, dinner])[0]!;
    expect(pickClusterRepresentative(cluster, ["dinner"], null).id).toBe("dinner");
  });
});

describe("today's meal path", () => {
  it("draws start to lunch to dinner in time order", () => {
    const pizza = event({
      id: "demo-ri-pizza",
      title: "Robotics Institute pizza talk",
      start_time: "2026-09-12T16:15:00.000Z",
      building_id: "nsh",
    });
    const dinner = event({
      id: "hackcmu-dinner",
      title: "Saturday Dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      building_id: "cuc",
    });
    const stops = buildMealRoute({
      events: [pizza, dinner],
      plannedIds: ["demo-ri-pizza", "hackcmu-dinner"],
      date: "2026-09-12",
      startBuildingId: "ghc",
    });
    expect(stops.filter((stop) => stop.kind !== "path").map((stop) => `${stop.kind}:${stop.buildingId}`)).toEqual([
      "start:ghc",
      "meal:nsh",
      "via:wean",
      "via:doherty",
      "meal:cuc",
    ]);
    expect(mealRouteDrawCoordinates(stops).length).toBeGreaterThan(8);
    expect(mealRouteLine(stops)?.geometry.coordinates.length).toBeGreaterThan(8);
  });

  it("does not keep a zero-length start when the first meal is at home", () => {
    const lunch = event({
      id: "gates-lunch",
      title: "Gates lunch",
      start_time: "2026-09-12T16:00:00.000Z",
      building_id: "ghc",
    });
    const dinner = event({
      id: "cuc-dinner",
      title: "CUC dinner",
      start_time: "2026-09-12T22:00:00.000Z",
      building_id: "cuc",
    });
    const stops = buildMealRoute({
      events: [lunch, dinner],
      plannedIds: ["gates-lunch", "cuc-dinner"],
      date: "2026-09-12",
      startBuildingId: "ghc",
    });
    expect(stops[0]?.kind).toBe("meal");
    expect(stops.filter((stop) => stop.kind !== "path").map((stop) => `${stop.kind}:${stop.buildingId}`)).toEqual([
      "meal:ghc",
      "via:nsh",
      "via:wean",
      "via:doherty",
      "meal:cuc",
    ]);
  });
});
