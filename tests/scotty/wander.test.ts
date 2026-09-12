import { describe, expect, it } from "vitest";
import { haversineMeters } from "@/lib/maps/geo";
import { pointInCampus } from "@/lib/maps/campus-mask";
import {
  campusFootwayGraph,
  directedRoadPoints,
  edgesTouching,
  nearestRoadHit,
  roadEndKey,
  stitchRoadGraph,
} from "@/lib/maps/road-graph";
import { createWanderMachine, facingFromDelta, positionAlongPath } from "@/lib/scotty/wander";

describe("campus footways", () => {
  it("loads OSM sidewalks inside the campus ring", () => {
    const edges = campusFootwayGraph();
    expect(edges.length).toBeGreaterThan(40);
    expect(
      edges.every((edge) =>
        edge.points.every((point) => pointInCampus(point.longitude, point.latitude)),
      ),
    ).toBe(true);
  });

  it("joins two sidewalks that share an endpoint", () => {
    const edges = stitchRoadGraph([
      [
        { longitude: -79.944, latitude: 40.442 },
        { longitude: -79.943, latitude: 40.442 },
      ],
      [
        { longitude: -79.943, latitude: 40.442 },
        { longitude: -79.943, latitude: 40.443 },
      ],
    ]);
    const first = edges[0]!;
    const next = edgesTouching(edges, first.end, first.id);
    expect(next.map((edge) => edge.id)).toEqual([1]);
    const points = directedRoadPoints(next[0]!, first.end);
    expect(points[0]).toEqual({ longitude: -79.943, latitude: 40.442 });
    expect(roadEndKey(next[0]!, first.end)).toBe(next[0]!.end);
  });
});

describe("scotty wander", () => {
  it("faces the dominant axis of movement", () => {
    expect(facingFromDelta(1, 0)).toBe("east");
    expect(facingFromDelta(-1, 0)).toBe("west");
    expect(facingFromDelta(0, 1)).toBe("north");
    expect(facingFromDelta(0, -1)).toBe("south");
  });

  it("reports done at the end of a northbound segment", () => {
    const from = { longitude: -79.944, latitude: 40.442 };
    const to = { longitude: -79.944, latitude: 40.443 };
    const start = positionAlongPath([from, to], 0);
    expect(start.facing).toBe("north");
    const end = positionAlongPath([from, to], 1_000_000);
    expect(end.done).toBe(true);
    expect(end.point).toEqual(to);
  });

  it("walks along a sidewalk segment instead of cutting the lawn", () => {
    const sidewalk = [
      { longitude: -79.9432, latitude: 40.4425 },
      { longitude: -79.9426, latitude: 40.4427 },
      { longitude: -79.942, latitude: 40.4428 },
    ];
    const machine = createWanderMachine({
      now: 0,
      rng: () => 0,
      edges: stitchRoadGraph([sidewalk]),
    });
    const start = nearestRoadHit(stitchRoadGraph([sidewalk]), sidewalk[0]!.longitude, sidewalk[0]!.latitude);
    expect(start?.point).toEqual(sidewalk[0]);
    const moving = machine.tick(400, 16);
    expect(moving.walking).toBe(true);
    const minLng = Math.min(...sidewalk.map((point) => point.longitude));
    const maxLng = Math.max(...sidewalk.map((point) => point.longitude));
    expect(moving.point.longitude).toBeGreaterThanOrEqual(minLng - 1e-9);
    expect(moving.point.longitude).toBeLessThanOrEqual(maxLng + 1e-9);
  });

  it("starts on the sidewalk vertex nearest CUC, not a far endpoint", () => {
    const edges = campusFootwayGraph();
    const hit = nearestRoadHit(edges, -79.94175, 40.44295);
    expect(hit).toBeTruthy();
    const snap = createWanderMachine({ now: 0, rng: () => 0 }).tick(0, 0);
    const meters = haversineMeters(
      snap.point.latitude,
      snap.point.longitude,
      hit!.point.latitude,
      hit!.point.longitude,
    );
    expect(meters).toBeLessThan(8);
    expect(pointInCampus(snap.point.longitude, snap.point.latitude)).toBe(true);
  });
});
