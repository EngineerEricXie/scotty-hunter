import { describe, expect, it } from "vitest";
import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";
import { frozenDemoNow } from "@/lib/demo-clock";
import { BUILDINGS, getBuildingMapLocation } from "@/lib/maps/buildings";
import {
  buildMealRoute,
  buildMealRoutePreview,
  mealRouteDrawCoordinates,
  mealRouteLine,
  mealStopByEventId,
} from "@/lib/maps/meal-route";
import { campusFootwayGraph } from "@/lib/maps/road-graph";
import { applyDemoPersona } from "@/lib/personalization/demo-persona";
import { withEventDefaults } from "@/lib/personalization/event-fields";
import { plannerRequestFromPrefs } from "@/lib/personalization/request";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";
import type { Event } from "@/lib/types";

function event(id: string, buildingId: string | null, time = "16:00"): Event {
  return withEventDefaults({
    id,
    title: id,
    start_time: `2026-09-12T${time}:00.000Z`,
    building_id: buildingId,
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    location_confidence: buildingId ? 1 : 0,
  });
}

function input(events: Event[], startBuildingId = "ghc") {
  return {
    events,
    plannedIds: events.map((item) => item.id),
    date: "2026-09-12",
    startBuildingId,
  };
}

// Every consecutive output pair must fit inside ONE source segment, including
// projected endpoints. Merely having endpoints somewhere on the graph is not enough.
function liesOnSegment(point: number[], a: number[], b: number[]): boolean {
  const dx = b[0]! - a[0]!;
  const dy = b[1]! - a[1]!;
  const length = dx * dx + dy * dy;
  if (!length) return point[0] === a[0] && point[1] === a[1];
  const fraction = ((point[0]! - a[0]!) * dx + (point[1]! - a[1]!) * dy) / length;
  return (
    fraction >= -1e-7 &&
    fraction <= 1 + 1e-7 &&
    Math.abs(a[0]! + fraction * dx - point[0]!) < 1e-10 &&
    Math.abs(a[1]! + fraction * dy - point[1]!) < 1e-10
  );
}

function expectOnlySourceSegments(coordinates: number[][]) {
  const segments = campusFootwayGraph().flatMap((edge) =>
    edge.points.slice(1).map((point, index) => [
      [edge.points[index]!.longitude, edge.points[index]!.latitude],
      [point.longitude, point.latitude],
    ]),
  );
  for (let index = 1; index < coordinates.length; index += 1) {
    const a = coordinates[index - 1]!;
    const b = coordinates[index]!;
    expect(a).not.toEqual(b);
    expect(
      segments.some(
        ([start, end]) =>
          liesOnSegment(a, start!, end!) && liesOnSegment(b, start!, end!),
      ),
    ).toBe(true);
  }
}

describe("safe meal route preview", () => {
  it("restores the default demo persona's complete visible sidewalk route", async () => {
    const events = await new LocalFixtureEventRepository().listEvents({
      date: "2026-09-12",
      include_none: false,
    });
    const prefs = applyDemoPersona(DEFAULT_PREFERENCES);
    const request = plannerRequestFromPrefs(prefs, "2026-09-12", "day");
    const plan = buildItinerary(events, request, frozenDemoNow());
    const preview = buildMealRoutePreview({
      events,
      plannedIds: plan.events.map((item) => item.id),
      date: request.date,
      startBuildingId: request.start_building_id,
    });
    expect(plan.events.map((item) => item.id)).toEqual([
      "demo-ri-pizza",
      "demo-cookie-hour",
      "hackcmu-2026-saturday-dinner",
    ]);
    expect(preview.status).toBe("complete");
    expect(preview.diagnostics).toEqual([]);
    expect(preview.lines.features).toHaveLength(3);
    expect(
      preview.legs.every((leg) => leg.status === "resolved" && leg.distanceMeters! > 0),
    ).toBe(true);
    for (const feature of preview.lines.features)
      expectOnlySourceSegments(feature.geometry.coordinates);
    expect(preview.accuracyNote).toMatch(/not entrances/);
  });

  it("uses corrected building anchors only for markers, never appends centroids to paths", () => {
    const preview = buildMealRoutePreview(input([event("lunch", "cuc")]));
    const cuc = getBuildingMapLocation("cuc")!;
    expect(preview.stops.at(-1)).toMatchObject({
      longitude: cuc.longitude,
      latitude: cuc.latitude,
    });
    const coordinates = preview.lines.features[0]!.geometry.coordinates;
    expect(coordinates.at(-1)).not.toEqual([cuc.longitude, cuc.latitude]);
    expectOnlySourceSegments(coordinates);
    expect(preview.legs[0]!.toSnapDistanceMeters).toBeLessThanOrEqual(60);
    expect(preview.lines.features[0]!.properties).toMatchObject({
      approximate: true,
      fromBuildingId: "ghc",
      toBuildingId: "cuc",
    });
  });

  it("preserves supported sections but does not bridge missing Tepper legs", () => {
    const preview = buildMealRoutePreview(
      input([
        event("breakfast", "cuc", "12:00"),
        event("tepper-lunch", "tepper", "16:00"),
        event("snacks", "nsh", "20:00"),
        event("dinner", "cuc", "22:00"),
      ]),
    );
    expect(preview.status).toBe("partial");
    expect(preview.legs.map((leg) => leg.status)).toEqual([
      "resolved",
      "unresolved",
      "unresolved",
      "resolved",
    ]);
    expect(preview.diagnostics.map((item) => item.reason)).toEqual([
      "outside-coverage",
      "outside-coverage",
    ]);
    expect(preview.lines.features.map((feature) => feature.properties?.legIndex)).toEqual(
      [0, 3],
    );
    const tepper = preview.stops.find((stop) => stop.buildingId === "tepper")!;
    expect(tepper.latitude).toBe(40.4450907);
    expect(tepper.longitude).toBe(-79.9453297);
    for (const feature of preview.lines.features)
      expectOnlySourceSegments(feature.geometry.coordinates);
  });

  it("supports every covered building pair without leaving source segments", () => {
    const covered = BUILDINGS.filter(
      (building) => !building.off_campus && building.id !== "tepper",
    );
    for (const from of covered) {
      for (const to of covered) {
        if (from.id === to.id) continue;
        const preview = buildMealRoutePreview(input([event("meal", to.id)], from.id));
        expect(
          preview.status,
          `${from.id} → ${to.id}: ${JSON.stringify(preview.diagnostics)}`,
        ).toBe("complete");
        expect(preview.lines.features).toHaveLength(1);
        expectOnlySourceSegments(preview.lines.features[0]!.geometry.coordinates);
      }
    }
  });

  it.each(["craig", "unknown-building", "tepper"])(
    "does not claim resolved coverage for an unsupported same-building start %s",
    (buildingId) => {
      const preview = buildMealRoutePreview(
        input([event("meal", buildingId)], buildingId),
      );
      expect(preview.status).toBe("unavailable");
      expect(preview.lines.features).toEqual([]);
      expect(preview.diagnostics).toHaveLength(1);
    },
  );

  it("fails closed for a single unavailable Tepper leg", () => {
    const preview = buildMealRoutePreview(input([event("tepper", "tepper")]));
    expect(preview.status).toBe("unavailable");
    expect(preview.lines.features).toEqual([]);
    expect(preview.diagnostics[0]).toMatchObject({
      reason: "outside-coverage",
      endpoint: "to",
    });
  });

  it.each([null, "unmapped-building", "craig"])(
    "does not skip unresolved venue %s into a false through-route",
    (buildingId) => {
      const preview = buildMealRoutePreview(
        input([event("unknown", buildingId, "16:00"), event("dinner", "cuc", "22:00")]),
      );
      expect(preview.legs).toHaveLength(2);
      expect(preview.lines.features).toEqual([]);
      expect(preview.status).toBe("unavailable");
      expect(preview.diagnostics).toHaveLength(2);
      expect(preview.diagnostics[0]!.reason).toBe(
        buildingId === "craig" ? "off-campus" : "unknown-building",
      );
      expect(preview.stops.some((stop) => stop.eventId === "unknown")).toBe(false);
    },
  );

  it("does not pretend an unknown start is a verified building", () => {
    const preview = buildMealRoutePreview(input([event("lunch", "cuc")], "unknown"));
    expect(preview.lines.features).toEqual([]);
    expect(preview.stops).toHaveLength(1);
    expect(preview.diagnostics[0]).toMatchObject({
      reason: "unknown-building",
      endpoint: "from",
    });
  });

  it("removes a zero-length home start but retains every same-building event", () => {
    const data = input([
      event("first", "ghc", "12:00"),
      event("second", "ghc", "16:00"),
      event("last", "cuc", "22:00"),
    ]);
    const preview = buildMealRoutePreview(data);
    expect(preview.stops.map((stop) => stop.eventId)).toEqual([
      "first",
      "second",
      "last",
    ]);
    expect(preview.stops[0]!.kind).toBe("meal");
    expect(preview.legs[0]!.distanceMeters).toBe(0);
    expect(preview.lines.features).toHaveLength(1);
    expect(mealStopByEventId(buildMealRoute(data))).toEqual(
      new Map([
        ["first", 1],
        ["second", 2],
        ["last", 3],
      ]),
    );
  });

  it("returns no route when nothing is selected on the campus-local date", () => {
    const wrongDay = { ...event("late", "nsh"), start_time: "2026-09-12T02:00:00.000Z" };
    const invalid = { ...event("invalid", "nsh"), start_time: "not-a-date" };
    const data = input([wrongDay, invalid]);
    expect(buildMealRoutePreview(data)).toMatchObject({
      status: "empty",
      stops: [],
      legs: [],
      diagnostics: [],
      lines: { features: [] },
    });
    expect(
      buildMealRoute({ ...input([event("not-selected", "cuc")]), plannedIds: [] }),
    ).toEqual([]);
  });

  it("sorts by actual time across different UTC offsets with deterministic ties", () => {
    const earlier = { ...event("early", "nsh"), start_time: "2026-09-12T17:00:00+02:00" };
    const later = { ...event("late", "cuc"), start_time: "2026-09-12T12:00:00-04:00" };
    const preview = buildMealRoutePreview(input([later, earlier]));
    expect(
      preview.stops.filter((stop) => stop.kind === "meal").map((stop) => stop.eventId),
    ).toEqual(["early", "late"]);
  });

  it("keeps the old single-line helpers from reconnecting missing legs", () => {
    const stops = buildMealRoute(
      input([
        event("breakfast", "cuc", "12:00"),
        event("unknown", null, "16:00"),
        event("snack", "nsh", "20:00"),
        event("dinner", "cuc", "22:00"),
      ]),
    );
    expect(mealRouteDrawCoordinates(stops)).toEqual([]);
    expect(mealRouteLine(stops)).toBeNull();
  });

  it("keeps a continuous compatibility line on source segments", () => {
    const stops = buildMealRoute(
      input([event("lunch", "nsh"), event("dinner", "cuc", "22:00")]),
    );
    const coordinates = mealRouteDrawCoordinates(stops);
    expect(coordinates.length).toBeGreaterThan(8);
    expect(mealRouteLine(stops)?.geometry.coordinates).toEqual(coordinates);
    expectOnlySourceSegments(coordinates);
    // Plain marker inputs must never become a centroid-to-centroid chord.
    expect(mealRouteLine(stops.filter((stop) => stop.kind !== "path"))).toBeNull();
  });
});
