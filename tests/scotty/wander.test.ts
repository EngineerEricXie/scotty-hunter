import { describe, expect, it } from "vitest";
import type { FeatureCollection, LineString } from "geojson";
import footways from "@/data/geo/cmu-footways.json";
import { haversineMeters } from "@/lib/maps/geo";
import { pointInCampus } from "@/lib/maps/campus-mask";
import {
  campusFootwayGraph,
  directedRoadPoints,
  edgesTouching,
  linesFromFootwayCollection,
  nearestRoadHit,
  roadEndKey,
  roadNodeKey,
  stitchRoadGraph,
  type GeoPoint,
  type RoadEdge,
} from "@/lib/maps/road-graph";
import {
  createWanderMachine,
  facingFromDelta,
  positionAlongPath,
  SCOTTY_WALK_MPS,
} from "@/lib/scotty/wander";

function distance(a: GeoPoint, b: GeoPoint): number {
  return haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
}

function connectedComponent(edges: RoadEdge[], initial: RoadEdge): Set<number> {
  const seen = new Set([initial.id]);
  const queue = [initial];
  for (const edge of queue) {
    for (const node of [edge.start, edge.end]) {
      for (const next of edgesTouching(edges, node)) {
        if (seen.has(next.id)) continue;
        seen.add(next.id);
        queue.push(next);
      }
    }
  }
  return seen;
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

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

  it("splits an interior junction without discarding the original bends", () => {
    const a = { longitude: -79.944, latitude: 40.442 };
    const bend = { longitude: -79.9437, latitude: 40.4421 };
    const junction = { longitude: -79.943, latitude: 40.442 };
    const b = { longitude: -79.942, latitude: 40.442 };
    const c = { longitude: -79.943, latitude: 40.443 };
    const edges = stitchRoadGraph([
      [a, bend, junction, b],
      [junction, c],
    ]);
    expect(edges.map((edge) => edge.points)).toEqual([
      [a, bend, junction],
      [junction, b],
      [junction, c],
    ]);
    expect(edgesTouching(edges, roadNodeKey(junction)).map((edge) => edge.id)).toEqual([
      0, 1, 2,
    ]);
  });

  it("does not join nearby separate sidewalks or invent junctions at crossings", () => {
    const a = { longitude: -79.943, latitude: 40.442 };
    const nearby = { longitude: -79.943001, latitude: 40.442001 };
    const edges = stitchRoadGraph([
      [a, { longitude: -79.942, latitude: 40.442 }],
      [nearby, { longitude: -79.943, latitude: 40.443 }],
      [
        { longitude: -79.9425, latitude: 40.4419 },
        { longitude: -79.9425, latitude: 40.4421 },
      ],
    ]);
    expect(edges).toHaveLength(3);
    expect(connectedComponent(edges, edges[0]!)).toEqual(new Set([0]));
  });

  it("ignores degenerate lines and removes consecutive duplicate points", () => {
    const a = { longitude: -79.943, latitude: 40.442 };
    const b = { longitude: -79.942, latitude: 40.442 };
    expect(stitchRoadGraph([[], [a], [a, a], [a, a, b, b]])).toEqual([
      { id: 0, points: [a, b], start: roadNodeKey(a), end: roadNodeKey(b) },
    ]);
  });

  it("connects CUC to the wider actual campus network using only source segments", () => {
    const lines = linesFromFootwayCollection(footways as FeatureCollection<LineString>);
    const edges = campusFootwayGraph();
    const hit = nearestRoadHit(edges, -79.94175, 40.44295)!;
    const reachable = connectedComponent(edges, hit.edge);
    expect(reachable.size).toBeGreaterThan(300);
    // Junction splitting must not expand into an edge for every shape vertex.
    expect(edges.length).toBeLessThan(lines.length * 2);
    const segments = (paths: GeoPoint[][]) =>
      paths
        .flatMap((points) =>
          points
            .slice(1)
            .map(
              (point, index) => `${roadNodeKey(points[index]!)}>${roadNodeKey(point)}`,
            ),
        )
        .sort();
    expect(segments(edges.map((edge) => edge.points))).toEqual(segments(lines));
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
    const start = nearestRoadHit(
      stitchRoadGraph([sidewalk]),
      sidewalk[0]!.longitude,
      sidewalk[0]!.latitude,
    );
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

  it.each([
    { seed: 0, lureBuildingIds: [], minutes: 120 },
    { seed: 42, lureBuildingIds: [], minutes: 120 },
    { seed: 42, lureBuildingIds: ["cuc"], minutes: 30 },
  ])(
    "explores actual campus sidewalks continuously ($seed, $lureBuildingIds)",
    ({ seed, lureBuildingIds, minutes }) => {
      const edges = campusFootwayGraph();
      const machine = createWanderMachine({
        now: 0,
        rng: seed === 0 ? () => 0 : seededRandom(seed),
        lureBuildingIds: () => lureBuildingIds,
      });
      const first = machine.tick(0, 0);
      let previous = first;
      const visited = new Set([first.nodeId]);
      let maxDistance = 0;
      let maxStep = 0;
      let leftInitialPath = false;
      for (let now = 50; now <= minutes * 60_000; now += 50) {
        const snap = machine.tick(now, 50);
        visited.add(snap.nodeId);
        maxDistance = Math.max(maxDistance, distance(first.point, snap.point));
        maxStep = Math.max(maxStep, distance(previous.point, snap.point));
        if (snap.nodeId !== previous.nodeId) {
          const before = edges[Number(previous.nodeId)]!;
          const after = edges[Number(snap.nodeId)]!;
          expect(
            [before.start, before.end].some(
              (node) => node === after.start || node === after.end,
            ),
          ).toBe(true);
          leftInitialPath = true;
        }
        if (now === 60_000) expect(visited.size).toBeGreaterThan(8);
        if (now === 30 * 60_000) expect(visited.size).toBeGreaterThan(200);
        previous = snap;
      }
      expect(leftInitialPath).toBe(true);
      expect(visited.size).toBeGreaterThan(200);
      expect(maxDistance).toBeGreaterThan(400);
      expect(maxStep).toBeLessThanOrEqual(SCOTTY_WALK_MPS * 0.05 + 0.001);
      if (lureBuildingIds.length === 0) {
        const reachable = connectedComponent(edges, edges[Number(first.nodeId)]!);
        expect(new Set([...visited].map(Number))).toEqual(reachable);
      }
    },
  );

  it("takes another connected branch instead of immediately retracing an edge", () => {
    const a = { longitude: -79.94175, latitude: 40.44295 };
    const junction = { longitude: -79.9417, latitude: 40.44295 };
    const b = { longitude: -79.94165, latitude: 40.44295 };
    const c = { longitude: -79.9417, latitude: 40.443 };
    const edges = stitchRoadGraph([
      [a, junction],
      [junction, b],
      [junction, c],
    ]);
    const machine = createWanderMachine({ now: 0, edges, rng: () => 0 });
    const routes: string[] = [];
    for (let now = 0; now <= 10_000; now += 50) {
      const snap = machine.tick(now, 50);
      if (routes[routes.length - 1] !== snap.nodeId) routes.push(snap.nodeId);
    }
    // Return from the dead end on edge 1, then prefer unvisited edge 2 to edge 0.
    expect(routes.slice(0, 4)).toEqual(["0", "1", "2", "0"]);
  });

  it("keeps pauses bounded and clamps long, negative, or invalid frame gaps", () => {
    const start = { longitude: -79.94175, latitude: 40.44295 };
    const end = { longitude: -79.941745, latitude: 40.44295 };
    const machine = createWanderMachine({
      now: 0,
      edges: stitchRoadGraph([[start, end]]),
      rng: () => 0,
    });
    const stopped = machine.tick(50, 50);
    expect(stopped.point).toEqual(end);
    expect(stopped.walking).toBe(false);
    expect(machine.tick(399, 50)).toEqual(stopped);
    expect(machine.tick(400, 0).walking).toBe(true);
    expect(machine.tick(401, -50).point).toEqual(end);
    expect(machine.tick(402, Number.NaN).point).toEqual(end);
    const resumed = machine.tick(3_600_000, 3_600_000);
    expect(resumed.point).toEqual(start);
    expect(distance(end, resumed.point)).toBeLessThanOrEqual(SCOTTY_WALK_MPS * 0.05);
    expect(machine.tick(3_601_000, 16).walking).toBe(true);
  });

  it("does not skip a long sidewalk after a stalled animation frame", () => {
    const start = { longitude: -79.94175, latitude: 40.44295 };
    const end = { longitude: -79.94275, latitude: 40.44295 };
    const machine = createWanderMachine({
      now: 0,
      edges: stitchRoadGraph([[start, end]]),
      rng: () => 0,
    });
    const resumed = machine.tick(3_600_000, 3_600_000);
    expect(resumed.walking).toBe(true);
    expect(distance(start, resumed.point)).toBeCloseTo(SCOTTY_WALK_MPS * 0.05, 5);
    expect(machine.tick(3_600_001, Number.POSITIVE_INFINITY).point).toEqual(
      resumed.point,
    );
  });

  it("stays finite and idle without footways", () => {
    const machine = createWanderMachine({ now: 0, edges: [] });
    const first = machine.tick(0, 0);
    expect(first.walking).toBe(false);
    expect(machine.tick(60_000, 60_000)).toEqual(first);
  });
});
