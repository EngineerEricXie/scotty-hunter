import { describe, expect, it } from "vitest";
import { haversineMeters } from "@/lib/maps/geo";
import {
  linesFromFootwayCollection,
  stitchRoadGraph,
  type GeoPoint,
} from "@/lib/maps/road-graph";
import {
  buildRouteNetwork,
  MAX_ROUTE_SNAP_METERS,
  routeOnNetwork,
} from "@/lib/maps/route-network";

const point = (x: number, y: number): GeoPoint => ({
  longitude: -79 + x / 100_000,
  latitude: 40 + y / 100_000,
});
const coordinates = (...points: GeoPoint[]) =>
  points.map((p) => [p.longitude, p.latitude]);
const network = (...lines: GeoPoint[][]) => buildRouteNetwork(stitchRoadGraph(lines));

describe("mapped sidewalk shortest paths", () => {
  it("keeps every bend instead of cutting across a U-shaped path", () => {
    const a = point(0, 0);
    const b = point(0, 50);
    const c = point(50, 50);
    const d = point(50, 0);
    const result = routeOnNetwork(network([a, b, c, d]), a, d);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(a, b, c, d));
    expect(result.distanceMeters).toBeGreaterThan(100);
  });

  it("chooses the shorter connected path with a shared intermediate vertex", () => {
    const a = point(0, 0);
    const b = point(40, 0);
    const c = point(80, 0);
    const long = point(40, 100);
    const result = routeOnNetwork(network([a, long, c], [a, b, c]), a, c);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(a, b, c));
    expect(result.distanceMeters).toBeCloseTo(
      haversineMeters(a.latitude, a.longitude, c.latitude, c.longitude),
      4,
    );
  });

  it("travels in both directions without mutating the reusable graph", () => {
    const points = [point(0, 0), point(0, 20), point(30, 20)];
    const graph = network(points);
    const before = [...graph.neighbors].map(([key, neighbors]) => [key, [...neighbors]]);
    const forward = routeOnNetwork(graph, points[0]!, points[2]!);
    const reverse = routeOnNetwork(graph, points[2]!, points[0]!);
    expect(forward.status).toBe("resolved");
    expect(reverse.status).toBe("resolved");
    if (forward.status !== "resolved" || reverse.status !== "resolved") return;
    expect(reverse.coordinates).toEqual([...forward.coordinates].reverse());
    expect(reverse.distanceMeters).toBeCloseTo(forward.distanceMeters, 8);
    expect([...graph.neighbors]).toEqual(before);
  });

  it("projects to segment interiors without drawing building-to-sidewalk spokes", () => {
    const graph = network([point(0, 0), point(100, 0)]);
    const result = routeOnNetwork(graph, point(20, 10), point(80, -10));
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(point(20, 0), point(80, 0)));
    expect(result.fromSnap.distanceMeters).toBeGreaterThan(10);
    expect(result.toSnap.distanceMeters).toBeGreaterThan(10);
  });

  it("handles two interior projections on the same segment in reverse order", () => {
    const result = routeOnNetwork(
      network([point(0, 0), point(100, 0)]),
      point(80, 0),
      point(20, 0),
    );
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(point(80, 0), point(20, 0)));
  });

  it("handles a shared endpoint without duplicate consecutive coordinates", () => {
    const junction = point(30, 0);
    const result = routeOnNetwork(
      network([point(0, 0), junction], [junction, point(30, 30)]),
      junction,
      junction,
    );
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(junction));
    expect(result.distanceMeters).toBe(0);
  });

  it("does not connect lines merely because they cross visually", () => {
    const result = routeOnNetwork(
      network([point(-100, 0), point(100, 0)], [point(0, -100), point(0, 100)]),
      point(-100, 0),
      point(0, 100),
    );
    expect(result).toEqual({ status: "unresolved", reason: "disconnected-network" });
  });

  it("connects a crossing only when both lines include its exact source vertex", () => {
    const center = point(0, 0);
    const a = point(-100, 0);
    const b = point(0, 100);
    const result = routeOnNetwork(
      network([a, center, point(100, 0)], [point(0, -100), center, b]),
      a,
      b,
    );
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.coordinates).toEqual(coordinates(a, center, b));
  });

  it("never stitches nearly touching but separate vertices", () => {
    const result = routeOnNetwork(
      network([point(0, 0), point(50, 0)], [point(50.1, 0), point(100, 0)]),
      point(0, 0),
      point(100, 0),
    );
    expect(result).toEqual({ status: "unresolved", reason: "disconnected-network" });
  });

  it("refuses equally near disconnected sidewalks instead of picking one arbitrarily", () => {
    const result = routeOnNetwork(
      network([point(0, -10), point(100, -10)], [point(0, 10), point(100, 10)]),
      point(50, 0),
      point(100, 10),
    );
    expect(result).toMatchObject({
      status: "unresolved",
      reason: "ambiguous-network",
      endpoint: "from",
    });
  });

  it("does not snap to a farther connected component to manufacture a route", () => {
    const result = routeOnNetwork(
      network([point(0, 0), point(100, 0)], [point(100, 15), point(200, 15)]),
      point(0, 0),
      point(130, 15),
    );
    expect(result).toEqual({ status: "unresolved", reason: "disconnected-network" });
  });

  it("caps off-network projections at 60m even if a caller requests more", () => {
    const graph = network([point(0, 0), point(100, 0)]);
    for (const maxSnapMeters of [undefined, 1_000, Infinity]) {
      const result = routeOnNetwork(graph, point(0, 0), point(100, 100), {
        maxSnapMeters,
      });
      expect(result).toMatchObject({
        status: "unresolved",
        reason: "outside-snap-distance",
        endpoint: "to",
      });
      if (result.status === "unresolved")
        expect(result.nearestDistanceMeters).toBeGreaterThan(MAX_ROUTE_SNAP_METERS);
    }
  });

  it("allows a stricter projection limit", () => {
    const result = routeOnNetwork(
      network([point(0, 0), point(100, 0)]),
      point(0, 3),
      point(100, 0),
      { maxSnapMeters: 2 },
    );
    expect(result).toMatchObject({
      status: "unresolved",
      reason: "outside-snap-distance",
      endpoint: "from",
    });
  });

  it("fails closed for absent or entirely invalid network geometry", () => {
    expect(routeOnNetwork(network(), point(0, 0), point(1, 1))).toMatchObject({
      status: "unresolved",
      reason: "empty-network",
    });
    const graph = network([point(0, 0), { longitude: NaN, latitude: 40 }, point(100, 0)]);
    expect(graph.segments).toHaveLength(0);
  });

  it.each([
    { longitude: NaN, latitude: 40 },
    { longitude: -79, latitude: Infinity },
    { longitude: 181, latitude: 40 },
    { longitude: -79, latitude: 91 },
  ])("rejects invalid endpoint %j", (invalid) => {
    expect(
      routeOnNetwork(network([point(0, 0), point(10, 0)]), invalid, point(10, 0)),
    ).toMatchObject({ status: "unresolved", reason: "invalid-coordinate" });
  });
});

describe("short explicit source connectors", () => {
  const a = { longitude: -79.945, latitude: 40.443 };
  const b = { longitude: -79.9449, latitude: 40.443 };
  const c = { longitude: -79.94489, latitude: 40.443 };
  const d = { longitude: -79.9448, latitude: 40.443 };

  function fromLines(lines: GeoPoint[][]) {
    return linesFromFootwayCollection({
      type: "FeatureCollection",
      features: lines.map((points) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coordinates(...points) },
      })),
    });
  }

  it("preserves a sub-meter connector that shares exact source vertices", () => {
    const lines = fromLines([
      [a, b],
      [b, c],
      [c, d],
    ]);
    expect(lines).toHaveLength(3);
    const graph = network(...lines);
    expect(new Set(graph.components.values()).size).toBe(1);
    const route = routeOnNetwork(graph, a, d);
    expect(route.status).toBe("resolved");
    if (route.status !== "resolved") return;
    expect(route.coordinates).toEqual(coordinates(a, b, c, d));
  });

  it("does not invent connectivity when a short connector misses the vertex", () => {
    const offset = { ...c, latitude: c.latitude + 0.0000001 };
    const graph = network(
      ...fromLines([
        [a, b],
        [b, c],
        [offset, d],
      ]),
    );
    expect(new Set(graph.components.values()).size).toBe(2);
    const route = routeOnNetwork(graph, a, d);
    expect(route).toEqual({ status: "unresolved", reason: "disconnected-network" });
  });

  it("still excludes zero-length source lines", () => {
    expect(
      fromLines([
        [a, a],
        [a, a, a],
      ]),
    ).toEqual([]);
  });
});
