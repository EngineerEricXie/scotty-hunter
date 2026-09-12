import {
  campusFootwayGraph,
  directedRoadPoints,
  edgesTouching,
  nearestRoadHit,
  roadEndKey,
  type GeoPoint,
  type RoadEdge,
} from "@/lib/maps/road-graph";
import { haversineMeters } from "@/lib/maps/geo";
import { getBuilding } from "@/lib/maps/buildings";

export type ScottyFacing = "south" | "north" | "east" | "west";
export type { GeoPoint };

export const SCOTTY_MAP_SPRITES: Record<ScottyFacing, string> = {
  south: "/sprites/scotty-map-south.png",
  north: "/sprites/scotty-map-north.png",
  east: "/sprites/scotty-map-east.png",
  west: "/sprites/scotty-map-west.png",
};

export const SCOTTY_WALK_MPS = 12;
const CUC = { longitude: -79.94175, latitude: 40.44295 };

export function facingFromDelta(dlng: number, dlat: number): ScottyFacing {
  if (Math.abs(dlng) < 1e-12 && Math.abs(dlat) < 1e-12) return "south";
  if (Math.abs(dlng) >= Math.abs(dlat)) return dlng > 0 ? "east" : "west";
  return dlat > 0 ? "north" : "south";
}

export function lerpLngLat(from: GeoPoint, to: GeoPoint, t: number): GeoPoint {
  const u = Math.min(1, Math.max(0, t));
  return {
    longitude: from.longitude + (to.longitude - from.longitude) * u,
    latitude: from.latitude + (to.latitude - from.latitude) * u,
  };
}

export function positionAlongPath(
  path: GeoPoint[],
  meters: number,
): { point: GeoPoint; facing: ScottyFacing; done: boolean } {
  const first = path[0];
  if (!first) {
    return { point: { longitude: 0, latitude: 0 }, facing: "south", done: true };
  }
  if (path.length === 1 || meters <= 0) {
    const next = path[1];
    return {
      point: first,
      facing: next
        ? facingFromDelta(next.longitude - first.longitude, next.latitude - first.latitude)
        : "south",
      done: path.length === 1,
    };
  }

  let remaining = meters;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    const length = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
    const last = i === path.length - 2;
    if (length === 0) {
      if (last) return { point: b, facing: "south", done: true };
      continue;
    }
    if (remaining <= length || last) {
      return {
        point: lerpLngLat(a, b, remaining / length),
        facing: facingFromDelta(b.longitude - a.longitude, b.latitude - a.latitude),
        done: last && remaining >= length,
      };
    }
    remaining -= length;
  }

  const last = path[path.length - 1] ?? first;
  const prev = path[path.length - 2] ?? last;
  return {
    point: last,
    facing: facingFromDelta(last.longitude - prev.longitude, last.latitude - prev.latitude),
    done: true,
  };
}

function startOnGraph(edges: RoadEdge[], origin: GeoPoint) {
  const hit = nearestRoadHit(edges, origin.longitude, origin.latitude);
  if (!hit) {
    return { path: [origin], atKey: "", edgeId: 0, point: origin, walking: false };
  }
  const last = hit.edge.points.length - 1;
  if (hit.index < last && last - hit.index >= hit.index) {
    return {
      path: hit.edge.points.slice(hit.index),
      atKey: hit.edge.end,
      edgeId: hit.edge.id,
      point: hit.point,
      walking: true,
    };
  }
  if (hit.index > 0) {
    return {
      path: hit.edge.points.slice(0, hit.index + 1).reverse(),
      atKey: hit.edge.start,
      edgeId: hit.edge.id,
      point: hit.point,
      walking: true,
    };
  }
  return {
    path: hit.edge.points,
    atKey: hit.edge.end,
    edgeId: hit.edge.id,
    point: hit.point,
    walking: hit.edge.points.length > 1,
  };
}

function lurePoint(buildingId: string): GeoPoint | null {
  const building = getBuilding(buildingId);
  if (!building || building.off_campus) return null;
  return { longitude: building.longitude, latitude: building.latitude };
}

function pickNextEdge(
  edges: RoadEdge[],
  atKey: string,
  currentId: number,
  rng: () => number,
  lureBuildingIds: string[],
): RoadEdge | null {
  const connected = edgesTouching(edges, atKey, currentId);
  const pool = connected.length > 0 ? connected : edgesTouching(edges, atKey);
  if (pool.length === 0) return null;
  const lures = lureBuildingIds.map(lurePoint).filter((point): point is GeoPoint => point !== null);
  if (lures.length > 0 && rng() < 0.4) {
    let best = pool[0]!;
    let bestMeters = Infinity;
    for (const edge of pool) {
      const mid = edge.points[Math.floor(edge.points.length / 2)] ?? edge.points[0]!;
      const meters = Math.min(
        ...lures.map((lure) => haversineMeters(lure.latitude, lure.longitude, mid.latitude, mid.longitude)),
      );
      if (meters < bestMeters) {
        bestMeters = meters;
        best = edge;
      }
    }
    return best;
  }
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

export interface WanderSnapshot {
  point: GeoPoint;
  facing: ScottyFacing;
  walking: boolean;
  buildingId: string;
  nodeId: string;
}

export function createWanderMachine(options?: {
  now?: number;
  rng?: () => number;
  lureBuildingIds?: () => string[];
  edges?: RoadEdge[];
  speedMps?: number;
}): { tick: (now: number, dtMs: number) => WanderSnapshot } {
  const rng = options?.rng ?? Math.random;
  const speed = options?.speedMps ?? SCOTTY_WALK_MPS;
  const lures = options?.lureBuildingIds ?? (() => []);
  const edges = options?.edges ?? campusFootwayGraph();
  const start = startOnGraph(edges, CUC);
  let edgeId = start.edgeId;
  let atKey = start.atKey;
  let path = start.path;
  let meters = 0;
  let walking = start.walking;
  let pauseUntil = walking ? 0 : (options?.now ?? 0) + 250;
  let facing: ScottyFacing = "south";
  let point = start.point;

  function snapshot(): WanderSnapshot {
    return { point, facing, walking, buildingId: "cuc", nodeId: String(edgeId) };
  }

  return {
    tick(now: number, dtMs: number): WanderSnapshot {
      if (!walking) {
        if (now < pauseUntil) return snapshot();
        const next = pickNextEdge(edges, atKey, edgeId, rng, lures());
        if (!next) {
          pauseUntil = now + 800;
          return snapshot();
        }
        path = directedRoadPoints(next, atKey);
        atKey = roadEndKey(next, atKey);
        edgeId = next.id;
        meters = 0;
        walking = path.length > 1;
        if (!walking) {
          pauseUntil = now + 800;
          return snapshot();
        }
      }

      meters += speed * (Math.min(50, Math.max(0, dtMs)) / 1000);
      const along = positionAlongPath(path, meters);
      point = along.point;
      facing = along.facing;
      if (along.done) {
        walking = false;
        pauseUntil = now + 350 + rng() * 900;
        const last = path[path.length - 1];
        if (last) point = last;
      }
      return snapshot();
    },
  };
}
