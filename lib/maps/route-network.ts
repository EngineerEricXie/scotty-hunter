import { haversineMeters } from "@/lib/maps/geo";
import { roadNodeKey, type GeoPoint, type RoadEdge } from "@/lib/maps/road-graph";

export type RouteCoordinate = [number, number];

export const MAX_ROUTE_SNAP_METERS = 60;
const AMBIGUOUS_SNAP_METERS = 3;

interface NetworkSegment {
  id: number;
  a: GeoPoint;
  b: GeoPoint;
  start: string;
  end: string;
}

interface Neighbor {
  key: string;
  meters: number;
}

export interface RouteNetwork {
  segments: NetworkSegment[];
  points: Map<string, GeoPoint>;
  neighbors: Map<string, Neighbor[]>;
  components: Map<string, number>;
}

export interface NetworkSnap {
  point: GeoPoint;
  distanceMeters: number;
  segmentId: number;
  componentId: number;
}

export type NetworkRouteFailure =
  | "invalid-coordinate"
  | "empty-network"
  | "outside-snap-distance"
  | "ambiguous-network"
  | "disconnected-network";

export type NetworkRoute =
  | {
      status: "resolved";
      coordinates: RouteCoordinate[];
      distanceMeters: number;
      fromSnap: NetworkSnap;
      toSnap: NetworkSnap;
    }
  | {
      status: "unresolved";
      reason: NetworkRouteFailure;
      endpoint?: "from" | "to";
      nearestDistanceMeters?: number;
    };

function validPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    Math.abs(point.longitude) <= 180 &&
    Math.abs(point.latitude) <= 90
  );
}

function distance(a: GeoPoint, b: GeoPoint): number {
  return haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
}

function connect(
  neighbors: Map<string, Neighbor[]>,
  a: string,
  b: string,
  meters: number,
) {
  const from = neighbors.get(a) ?? [];
  from.push({ key: b, meters });
  neighbors.set(a, from);
  const to = neighbors.get(b) ?? [];
  to.push({ key: a, meters });
  neighbors.set(b, to);
}

/** Every bend is a vertex. Only identical source vertices are junctions. */
export function buildRouteNetwork(edges: RoadEdge[]): RouteNetwork {
  const network: RouteNetwork = {
    segments: [],
    points: new Map(),
    neighbors: new Map(),
    components: new Map(),
  };
  for (const edge of edges) {
    for (let index = 1; index < edge.points.length; index += 1) {
      const a = edge.points[index - 1]!;
      const b = edge.points[index]!;
      if (!validPoint(a) || !validPoint(b)) continue;
      const start = roadNodeKey(a);
      const end = roadNodeKey(b);
      if (start === end) continue;
      network.segments.push({ id: network.segments.length, a, b, start, end });
      network.points.set(start, a);
      network.points.set(end, b);
      connect(network.neighbors, start, end, distance(a, b));
    }
  }

  let component = 0;
  for (const key of network.points.keys()) {
    if (network.components.has(key)) continue;
    const queue = [key];
    network.components.set(key, component);
    while (queue.length) {
      const current = queue.pop()!;
      for (const neighbor of network.neighbors.get(current) ?? []) {
        if (network.components.has(neighbor.key)) continue;
        network.components.set(neighbor.key, component);
        queue.push(neighbor.key);
      }
    }
    component += 1;
  }
  return network;
}

/** Project onto an existing segment, never onto an invented building connector. */
function project(point: GeoPoint, segment: NetworkSegment): GeoPoint {
  const xScale = Math.cos((point.latitude * Math.PI) / 180);
  const dx = (segment.b.longitude - segment.a.longitude) * xScale;
  const dy = segment.b.latitude - segment.a.latitude;
  const denominator = dx * dx + dy * dy;
  const fraction = Math.max(
    0,
    Math.min(
      1,
      denominator === 0
        ? 0
        : ((point.longitude - segment.a.longitude) * xScale * dx +
            (point.latitude - segment.a.latitude) * dy) /
            denominator,
    ),
  );
  if (fraction === 0) return segment.a;
  if (fraction === 1) return segment.b;
  return {
    longitude:
      segment.a.longitude + fraction * (segment.b.longitude - segment.a.longitude),
    latitude: segment.a.latitude + fraction * (segment.b.latitude - segment.a.latitude),
  };
}

type SnapResult =
  | { status: "resolved"; snap: NetworkSnap }
  | Exclude<NetworkRoute, { status: "resolved" }>;

function snapToNetwork(
  network: RouteNetwork,
  point: GeoPoint,
  maxSnapMeters: number,
  ambiguityMeters: number,
): SnapResult {
  if (!validPoint(point)) return { status: "unresolved", reason: "invalid-coordinate" };
  // Retain the nearest hit per component. Never prefer a farther component just
  // because it would make an otherwise disconnected route succeed.
  const candidates = new Map<number, NetworkSnap>();
  for (const segment of network.segments) {
    const projected = project(point, segment);
    const distanceMeters = distance(point, projected);
    const componentId = network.components.get(segment.start)!;
    const prior = candidates.get(componentId);
    if (!prior || distanceMeters < prior.distanceMeters) {
      candidates.set(componentId, {
        point: projected,
        distanceMeters,
        segmentId: segment.id,
        componentId,
      });
    }
  }
  const sorted = [...candidates.values()].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
  const nearest = sorted[0];
  if (!nearest) return { status: "unresolved", reason: "empty-network" };
  if (nearest.distanceMeters > maxSnapMeters) {
    return {
      status: "unresolved",
      reason: "outside-snap-distance",
      nearestDistanceMeters: nearest.distanceMeters,
    };
  }
  const alternative = sorted[1];
  if (
    alternative &&
    alternative.distanceMeters <= maxSnapMeters &&
    alternative.distanceMeters - nearest.distanceMeters <= ambiguityMeters
  ) {
    return {
      status: "unresolved",
      reason: "ambiguous-network",
      nearestDistanceMeters: nearest.distanceMeters,
    };
  }
  return { status: "resolved", snap: nearest };
}

/** Shortest path along source segments. Missing connectivity always fails closed. */
export function routeOnNetwork(
  network: RouteNetwork,
  from: GeoPoint,
  to: GeoPoint,
  options: { maxSnapMeters?: number; ambiguityMeters?: number } = {},
): NetworkRoute {
  const requestedSnap = options.maxSnapMeters ?? MAX_ROUTE_SNAP_METERS;
  // Callers may tighten the safety limit, but cannot silently relax it.
  const maxSnapMeters = Number.isFinite(requestedSnap)
    ? Math.max(0, Math.min(MAX_ROUTE_SNAP_METERS, requestedSnap))
    : MAX_ROUTE_SNAP_METERS;
  const requestedAmbiguity = options.ambiguityMeters ?? AMBIGUOUS_SNAP_METERS;
  const ambiguityMeters = Number.isFinite(requestedAmbiguity)
    ? Math.max(0, requestedAmbiguity)
    : AMBIGUOUS_SNAP_METERS;
  const source = snapToNetwork(network, from, maxSnapMeters, ambiguityMeters);
  if (source.status === "unresolved") return { ...source, endpoint: "from" };
  const target = snapToNetwork(network, to, maxSnapMeters, ambiguityMeters);
  if (target.status === "unresolved") return { ...target, endpoint: "to" };
  if (source.snap.componentId !== target.snap.componentId) {
    return { status: "unresolved", reason: "disconnected-network" };
  }

  const points = new Map(network.points);
  const neighbors = new Map(
    [...network.neighbors].map(([key, values]) => [key, [...values]]),
  );
  const start = "route:from";
  const finish = "route:to";
  points.set(start, source.snap.point);
  points.set(finish, target.snap.point);
  for (const [key, snap] of [
    [start, source.snap],
    [finish, target.snap],
  ] as const) {
    const segment = network.segments[snap.segmentId]!;
    connect(neighbors, key, segment.start, distance(snap.point, segment.a));
    connect(neighbors, key, segment.end, distance(snap.point, segment.b));
  }
  // Two projections on the same segment can travel directly along that segment.
  if (source.snap.segmentId === target.snap.segmentId) {
    connect(neighbors, start, finish, distance(source.snap.point, target.snap.point));
  }

  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const pending = new Set<string>([start]);
  const visited = new Set<string>();
  while (pending.size) {
    let current = "";
    let best = Infinity;
    for (const key of pending) {
      const meters = distances.get(key)!;
      if (meters < best) {
        current = key;
        best = meters;
      }
    }
    if (!current || current === finish) break;
    pending.delete(current);
    visited.add(current);
    for (const neighbor of neighbors.get(current) ?? []) {
      if (visited.has(neighbor.key)) continue;
      const meters = best + neighbor.meters;
      if (meters >= (distances.get(neighbor.key) ?? Infinity)) continue;
      distances.set(neighbor.key, meters);
      previous.set(neighbor.key, current);
      pending.add(neighbor.key);
    }
  }
  if (!distances.has(finish))
    return { status: "unresolved", reason: "disconnected-network" };

  const keys = [finish];
  while (keys[keys.length - 1] !== start)
    keys.push(previous.get(keys[keys.length - 1]!)!);
  const coordinates: RouteCoordinate[] = [];
  for (const key of keys.reverse()) {
    const point = points.get(key)!;
    const last = coordinates[coordinates.length - 1];
    if (last?.[0] === point.longitude && last[1] === point.latitude) continue;
    coordinates.push([point.longitude, point.latitude]);
  }
  return {
    status: "resolved",
    coordinates,
    distanceMeters: distances.get(finish)!,
    fromSnap: source.snap,
    toSnap: target.snap,
  };
}
