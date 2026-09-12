import { getBuilding } from "@/lib/maps/buildings";

export type ConnectorKind = "indoor" | "outdoor";
export type LngLat = [number, number];

export interface CampusHop {
  from: string;
  to: string;
  minutes: number;
  kind: ConnectorKind;
  label: string;
  geometry: LngLat[];
}

export interface CampusWalk {
  minutes: number;
  path: string[];
  hops: CampusHop[];
}

export interface CampusExit {
  id: string;
  buildingId: string;
  longitude: number;
  latitude: number;
  label: string;
}

interface GraphEdge {
  from: string;
  to: string;
  minutes: number;
  kind: ConnectorKind;
  label: string;
  geometry: LngLat[];
}

function core(buildingId: string): string {
  return buildingId;
}

function isCore(nodeId: string): boolean {
  return !nodeId.includes(":");
}

function buildingOf(nodeId: string): string {
  return nodeId.split(":")[0] ?? nodeId;
}

/**
 * Standard doors. Doherty mall is the east plaza exit circled on the map
 * (beige pad by the recycling bin), not the north facade.
 */
export const CAMPUS_EXITS: CampusExit[] = [
  { id: "ghc:plaza", buildingId: "ghc", longitude: -79.9447, latitude: 40.44405, label: "GHC plaza" },
  { id: "ghc:east", buildingId: "ghc", longitude: -79.94412, latitude: 40.4435, label: "GHC east" },
  { id: "nsh:north", buildingId: "nsh", longitude: -79.9455, latitude: 40.44372, label: "NSH north" },
  { id: "wean:east", buildingId: "wean", longitude: -79.94515, latitude: 40.44252, label: "Wean east" },
  { id: "doherty:mall", buildingId: "doherty", longitude: -79.94416, latitude: 40.44228, label: "Doherty mall" },
  { id: "scott:west", buildingId: "scott", longitude: -79.9469, latitude: 40.44318, label: "Scott west" },
  { id: "scott:east", buildingId: "scott", longitude: -79.9465, latitude: 40.44328, label: "Scott east" },
  { id: "ansys:west", buildingId: "ansys", longitude: -79.9469, latitude: 40.44235, label: "ANSYS west" },
  { id: "ansys:south", buildingId: "ansys", longitude: -79.9465, latitude: 40.44208, label: "ANSYS south" },
  { id: "porter:north", buildingId: "porter", longitude: -79.94628, latitude: 40.44188, label: "Porter north" },
  { id: "baker:north", buildingId: "baker", longitude: -79.9455, latitude: 40.44162, label: "Baker north" },
  { id: "hamburg:south", buildingId: "hamburg", longitude: -79.94505, latitude: 40.4440, label: "Hamburg south" },
  { id: "hunt:north", buildingId: "hunt", longitude: -79.94355, latitude: 40.44128, label: "Hunt north" },
  { id: "cuc:west", buildingId: "cuc", longitude: -79.94195, latitude: 40.44282, label: "CUC west" },
  { id: "cuc:south", buildingId: "cuc", longitude: -79.9417, latitude: 40.4424, label: "CUC south" },
  { id: "tepper:north", buildingId: "tepper", longitude: -79.9418, latitude: 40.44155, label: "Tepper north" },
  { id: "tepper:west", buildingId: "tepper", longitude: -79.94235, latitude: 40.4412, label: "Tepper west" },
  { id: "posner:north", buildingId: "posner", longitude: -79.94285, latitude: 40.44128, label: "Posner north" },
];

const EXIT_BY_ID = new Map(CAMPUS_EXITS.map((exit) => [exit.id, exit]));

function nodeLngLat(nodeId: string): LngLat | null {
  const exit = EXIT_BY_ID.get(nodeId);
  if (exit) return [exit.longitude, exit.latitude];
  const building = getBuilding(nodeId);
  if (!building) return null;
  return [building.longitude, building.latitude];
}

const EDGES: GraphEdge[] = [
  {
    from: "ghc",
    to: "nsh",
    minutes: 2,
    kind: "indoor",
    label: "GHC–NSH bridge",
    geometry: [
      [-79.94455, 40.44355],
      [-79.94485, 40.44354],
      [-79.94515, 40.44352],
    ],
  },
  {
    from: "nsh",
    to: "wean",
    minutes: 2,
    kind: "indoor",
    label: "NSH–Wean bridge",
    geometry: [
      [-79.94558, 40.44342],
      [-79.9457, 40.44308],
      [-79.9458, 40.44272],
    ],
  },
  {
    from: "wean",
    to: "doherty",
    minutes: 2,
    kind: "indoor",
    label: "Wean–Doherty bridge",
    geometry: [
      [-79.94583, 40.44251],
      [-79.9452, 40.4425],
      [-79.94478, 40.44248],
      [-79.94448, 40.44248],
    ],
  },
  {
    from: "doherty",
    to: "doherty:mall",
    minutes: 1,
    kind: "indoor",
    label: "Doherty to mall exit",
    geometry: [
      [-79.94428, 40.44238],
      [-79.94416, 40.44228],
    ],
  },
  {
    from: "cuc",
    to: "cuc:west",
    minutes: 1,
    kind: "indoor",
    label: "CUC to west doors",
    geometry: [[-79.94195, 40.44282]],
  },
  {
    from: "cuc",
    to: "cuc:south",
    minutes: 1,
    kind: "indoor",
    label: "CUC to south doors",
    geometry: [[-79.9417, 40.4424]],
  },
  {
    from: "ghc",
    to: "ghc:plaza",
    minutes: 1,
    kind: "indoor",
    label: "GHC to plaza doors",
    geometry: [[-79.9447, 40.44405]],
  },
  {
    from: "ghc",
    to: "ghc:east",
    minutes: 1,
    kind: "indoor",
    label: "GHC to east doors",
    geometry: [
      [-79.94428, 40.44352],
      [-79.94412, 40.4435],
      [-79.94372, 40.44345],
      [-79.94342, 40.4434],
    ],
  },
  {
    from: "nsh",
    to: "nsh:north",
    minutes: 1,
    kind: "indoor",
    label: "NSH to north doors",
    geometry: [[-79.9455, 40.44372]],
  },
  {
    from: "hamburg",
    to: "hamburg:south",
    minutes: 1,
    kind: "indoor",
    label: "Hamburg to south doors",
    geometry: [[-79.94505, 40.444]],
  },
  {
    from: "hunt",
    to: "hunt:north",
    minutes: 1,
    kind: "indoor",
    label: "Hunt to north doors",
    geometry: [[-79.94355, 40.44128]],
  },
  {
    from: "tepper",
    to: "tepper:north",
    minutes: 1,
    kind: "indoor",
    label: "Tepper to north doors",
    geometry: [[-79.9418, 40.44155]],
  },
  {
    from: "tepper",
    to: "tepper:west",
    minutes: 1,
    kind: "indoor",
    label: "Tepper to west doors",
    geometry: [[-79.94235, 40.4412]],
  },
  {
    from: "posner",
    to: "posner:north",
    minutes: 1,
    kind: "indoor",
    label: "Posner to north doors",
    geometry: [[-79.94285, 40.44128]],
  },
  {
    from: "wean",
    to: "wean:east",
    minutes: 1,
    kind: "indoor",
    label: "Wean to east doors",
    geometry: [[-79.94515, 40.44252]],
  },
  {
    from: "scott",
    to: "scott:west",
    minutes: 1,
    kind: "indoor",
    label: "Scott to west doors",
    geometry: [[-79.9469, 40.44318]],
  },
  {
    from: "scott",
    to: "scott:east",
    minutes: 1,
    kind: "indoor",
    label: "Scott to east doors",
    geometry: [[-79.9465, 40.44328]],
  },
  {
    from: "ansys",
    to: "ansys:west",
    minutes: 1,
    kind: "indoor",
    label: "ANSYS to west doors",
    geometry: [[-79.9469, 40.44235]],
  },
  {
    from: "ansys",
    to: "ansys:south",
    minutes: 1,
    kind: "indoor",
    label: "ANSYS to south doors",
    geometry: [[-79.9465, 40.44208]],
  },
  {
    from: "porter",
    to: "porter:north",
    minutes: 1,
    kind: "indoor",
    label: "Porter to north doors",
    geometry: [[-79.94628, 40.44188]],
  },
  {
    from: "baker",
    to: "baker:north",
    minutes: 1,
    kind: "indoor",
    label: "Baker to north doors",
    geometry: [[-79.9455, 40.44162]],
  },
  {
    from: "doherty:mall",
    to: "cuc:west",
    minutes: 2,
    kind: "outdoor",
    label: "Doherty mall exit across The Cut",
    geometry: [
      [-79.94416, 40.44228],
      [-79.9439, 40.44238],
      [-79.9435, 40.44258],
      [-79.9429, 40.44282],
      [-79.9425, 40.4429],
      [-79.94195, 40.44282],
    ],
  },
  {
    from: "ghc:plaza",
    to: "doherty:mall",
    minutes: 7,
    kind: "outdoor",
    label: "The Mall to Doherty",
    geometry: [
      [-79.9447, 40.44405],
      [-79.94472, 40.4437],
      [-79.94478, 40.44335],
      [-79.94482, 40.443],
      [-79.9447, 40.4427],
      [-79.9444, 40.44248],
      [-79.94416, 40.44228],
    ],
  },
  {
    from: "nsh:north",
    to: "wean:east",
    minutes: 3,
    kind: "outdoor",
    label: "NSH to Wean east walk",
    geometry: [
      [-79.9455, 40.44372],
      [-79.94548, 40.4434],
      [-79.9454, 40.44305],
      [-79.94525, 40.4427],
      [-79.94515, 40.44252],
    ],
  },
  {
    from: "wean:east",
    to: "doherty:mall",
    minutes: 3,
    kind: "outdoor",
    label: "Wean east to Doherty mall",
    geometry: [
      [-79.94515, 40.44252],
      [-79.9448, 40.44248],
      [-79.94445, 40.4424],
      [-79.94416, 40.44228],
    ],
  },
  {
    from: "doherty:mall",
    to: "hunt:north",
    minutes: 3,
    kind: "outdoor",
    label: "Doherty mall to Hunt",
    geometry: [
      [-79.94405, 40.4422],
      [-79.9439, 40.4417],
      [-79.94355, 40.44128],
    ],
  },
  {
    from: "doherty:mall",
    to: "tepper:north",
    minutes: 3,
    kind: "outdoor",
    label: "Doherty mall to Tepper Quad",
    geometry: [
      [-79.94405, 40.4422],
      [-79.94355, 40.44195],
      [-79.9427, 40.4417],
      [-79.9418, 40.44155],
    ],
  },
  {
    from: "hunt:north",
    to: "cuc:west",
    minutes: 4,
    kind: "outdoor",
    label: "Hunt ground walk to CUC",
    geometry: [
      [-79.94332, 40.44121],
      [-79.94316, 40.44163],
      [-79.94307, 40.44188],
      [-79.94335, 40.44258],
      [-79.94278, 40.44286],
      [-79.94195, 40.44282],
    ],
  },
  {
    from: "ghc:plaza",
    to: "hamburg:south",
    minutes: 2,
    kind: "outdoor",
    label: "GHC plaza to Hamburg",
    geometry: [
      [-79.94485, 40.4441],
      [-79.94505, 40.444],
    ],
  },
  {
    from: "hamburg:south",
    to: "nsh:north",
    minutes: 3,
    kind: "outdoor",
    label: "Hamburg to NSH",
    geometry: [
      [-79.9452, 40.44395],
      [-79.9455, 40.44372],
    ],
  },
  {
    from: "cuc:south",
    to: "tepper:north",
    minutes: 3,
    kind: "outdoor",
    label: "CUC to Tepper Quad",
    geometry: [
      [-79.9417, 40.4424],
      [-79.9417, 40.4421],
      [-79.94175, 40.4418],
      [-79.9418, 40.44155],
    ],
  },
  {
    from: "hunt:north",
    to: "tepper:west",
    minutes: 3,
    kind: "outdoor",
    label: "Hunt to Tepper",
    geometry: [
      [-79.9432, 40.44105],
      [-79.94235, 40.4412],
    ],
  },
  {
    from: "tepper:north",
    to: "posner:north",
    minutes: 2,
    kind: "outdoor",
    label: "Tepper to Posner",
    geometry: [[-79.9424, 40.44122]],
  },
  {
    from: "hunt:north",
    to: "posner:north",
    minutes: 2,
    kind: "outdoor",
    label: "Hunt to Posner",
    geometry: [
      [-79.9432, 40.44108],
      [-79.94285, 40.44128],
    ],
  },
  {
    from: "cuc:south",
    to: "posner:north",
    minutes: 4,
    kind: "outdoor",
    label: "CUC to Posner",
    geometry: [
      [-79.9419, 40.4422],
      [-79.9422, 40.4415],
    ],
  },
  {
    from: "scott:west",
    to: "ansys:west",
    minutes: 2,
    kind: "outdoor",
    label: "Scott to ANSYS along Hamerschlag",
    geometry: [
      [-79.9469, 40.44318],
      [-79.94692, 40.44278],
      [-79.9469, 40.44235],
    ],
  },
  {
    from: "scott:east",
    to: "nsh:north",
    minutes: 3,
    kind: "outdoor",
    label: "Scott east to NSH",
    geometry: [
      [-79.9465, 40.44328],
      [-79.9461, 40.4434],
      [-79.9457, 40.44355],
      [-79.9455, 40.44372],
    ],
  },
  {
    from: "ansys:south",
    to: "porter:north",
    minutes: 1,
    kind: "outdoor",
    label: "ANSYS to Porter",
    geometry: [
      [-79.9465, 40.44208],
      [-79.9464, 40.44195],
      [-79.94628, 40.44188],
    ],
  },
  {
    from: "porter:north",
    to: "baker:north",
    minutes: 2,
    kind: "outdoor",
    label: "Porter to Baker",
    geometry: [
      [-79.94628, 40.44188],
      [-79.9459, 40.4417],
      [-79.9455, 40.44162],
    ],
  },
  {
    from: "baker:north",
    to: "hunt:north",
    minutes: 3,
    kind: "outdoor",
    label: "Baker to Hunt",
    geometry: [
      [-79.9455, 40.44162],
      [-79.9448, 40.44145],
      [-79.9442, 40.44128],
      [-79.94355, 40.44128],
    ],
  },
];

const ADJACENCY = buildAdjacency(EDGES);

function reverseGeometry(points: LngLat[]): LngLat[] {
  return [...points].reverse();
}

function buildAdjacency(edges: GraphEdge[]) {
  const map = new Map<string, CampusHop[]>();
  function add(edge: CampusHop) {
    const list = map.get(edge.from) ?? [];
    list.push(edge);
    map.set(edge.from, list);
  }
  for (const edge of edges) {
    add(edge);
    add({
      from: edge.to,
      to: edge.from,
      minutes: edge.minutes,
      kind: edge.kind,
      label: edge.label,
      geometry: reverseGeometry(edge.geometry),
    });
  }
  return map;
}

function dijkstra(
  fromNode: string,
  toNode: string,
  kinds?: ConnectorKind[],
): CampusHop[] | null {
  if (!ADJACENCY.has(fromNode) || !ADJACENCY.has(toNode)) return null;
  const dist = new Map<string, number>();
  const prev = new Map<string, CampusHop>();
  const unused = new Set(ADJACENCY.keys());
  dist.set(fromNode, 0);

  while (unused.size > 0) {
    let current: string | null = null;
    let best = Infinity;
    for (const node of unused) {
      const d = dist.get(node) ?? Infinity;
      if (d < best) {
        best = d;
        current = node;
      }
    }
    if (current == null || best === Infinity) break;
    unused.delete(current);
    if (current === toNode) break;
    for (const hop of ADJACENCY.get(current) ?? []) {
      if (kinds && !kinds.includes(hop.kind)) continue;
      if (!unused.has(hop.to)) continue;
      const next = best + hop.minutes;
      if (next < (dist.get(hop.to) ?? Infinity)) {
        dist.set(hop.to, next);
        prev.set(hop.to, hop);
      }
    }
  }

  if (!dist.has(toNode)) return null;
  const hops: CampusHop[] = [];
  let cursor = toNode;
  while (cursor !== fromNode) {
    const hop = prev.get(cursor);
    if (!hop) return null;
    hops.unshift(hop);
    cursor = hop.from;
  }
  return hops;
}

function coresFromHops(fromBuildingId: string, hops: CampusHop[]): string[] {
  const path = [fromBuildingId];
  for (const hop of hops) {
    const building = buildingOf(hop.to);
    if (isCore(hop.to) && path[path.length - 1] !== building) {
      path.push(building);
    }
  }
  return path;
}

/**
 * Shortest path between building interiors: indoor bridges first,
 * then the best standard exit, then outdoor walkways.
 */
export function campusWalk(
  fromBuildingId: string,
  toBuildingId: string,
): CampusWalk | null {
  if (fromBuildingId === toBuildingId) {
    return { minutes: 2, path: [fromBuildingId], hops: [] };
  }
  const hops = dijkstra(core(fromBuildingId), core(toBuildingId));
  if (!hops) return null;
  return {
    minutes: hops.reduce((sum, hop) => sum + hop.minutes, 0),
    path: coresFromHops(fromBuildingId, hops),
    hops,
  };
}

export function outdoorExitsForBuilding(id: string): string[] {
  if (EXIT_BY_ID.has(id)) return [id];
  return CAMPUS_EXITS.filter((exit) => exit.buildingId === id).map((exit) => exit.id);
}

export function resolveOutdoorNode(id: string): string | null {
  return outdoorExitsForBuilding(id)[0] ?? null;
}

export function campusOutdoorNodeIds(): string[] {
  return CAMPUS_EXITS.map((exit) => exit.id);
}

export function campusOutdoorNeighbors(nodeId: string): string[] {
  const node = resolveOutdoorNode(nodeId);
  if (!node) return [];
  return (ADJACENCY.get(node) ?? [])
    .filter((hop) => hop.kind === "outdoor")
    .map((hop) => hop.to);
}

/**
 * Door-to-door walk on official outdoor connectors only.
 * Building interiors and indoor bridges are not used.
 */
export function campusOutdoorWalk(fromId: string, toId: string): CampusWalk | null {
  const fromNodes = outdoorExitsForBuilding(fromId);
  const toNodes = outdoorExitsForBuilding(toId);
  let best: CampusWalk | null = null;
  for (const fromNode of fromNodes) {
    for (const toNode of toNodes) {
      if (fromNode === toNode) {
        const empty = { minutes: 0, path: [fromNode], hops: [] };
        if (!best || empty.minutes < best.minutes) best = empty;
        continue;
      }
      const hops = dijkstra(fromNode, toNode, ["outdoor"]);
      if (!hops) continue;
      const candidate: CampusWalk = {
        minutes: hops.reduce((sum, hop) => sum + hop.minutes, 0),
        path: [fromNode, ...hops.map((hop) => hop.to)],
        hops,
      };
      if (!best || candidate.minutes < best.minutes) best = candidate;
    }
  }
  return best;
}

function appendLngLat(points: LngLat[], next: LngLat) {
  const last = points[points.length - 1];
  if (last && last[0] === next[0] && last[1] === next[1]) return;
  points.push(next);
}

export function outdoorHopPolyline(hop: CampusHop): LngLat[] {
  const points: LngLat[] = [];
  const from = nodeLngLat(hop.from);
  const to = nodeLngLat(hop.to);
  if (from) appendLngLat(points, from);
  for (const point of hop.geometry) appendLngLat(points, point);
  if (to) appendLngLat(points, to);
  return points;
}

/** Vertex-by-vertex outdoor sidewalks. This is the line Scotty must follow. */
export function outdoorWalkPolyline(fromId: string, toId: string): LngLat[] {
  const walk = campusOutdoorWalk(fromId, toId);
  if (!walk) return [];
  if (walk.hops.length === 0) {
    const start = nodeLngLat(walk.path[0] ?? "");
    return start ? [start] : [];
  }
  const points: LngLat[] = [];
  for (const hop of walk.hops) {
    if (hop.kind !== "outdoor") continue;
    for (const point of outdoorHopPolyline(hop)) appendLngLat(points, point);
  }
  return points;
}

export function campusOutdoorEdgePolylines(): LngLat[][] {
  return EDGES.filter((edge) => edge.kind === "outdoor").map((edge) =>
    outdoorHopPolyline({
      from: edge.from,
      to: edge.to,
      minutes: edge.minutes,
      kind: edge.kind,
      label: edge.label,
      geometry: edge.geometry,
    }),
  );
}

export function campusGraphIds(): string[] {
  return [...new Set([...ADJACENCY.keys()].filter(isCore))];
}

export function campusNeighbors(buildingId: string): string[] {
  const start = core(buildingId);
  const seen = new Set<string>();
  for (const hop of ADJACENCY.get(start) ?? []) {
    if (isCore(hop.to)) {
      if (hop.to !== start) seen.add(hop.to);
      continue;
    }
    for (const next of ADJACENCY.get(hop.to) ?? []) {
      const other = buildingOf(next.to);
      if (other !== start) seen.add(other);
    }
  }
  return [...seen];
}

export function campusWalkHint(fromBuildingId: string, toBuildingId: string): string | null {
  const walk = campusWalk(fromBuildingId, toBuildingId);
  if (!walk || walk.hops.length === 0) return null;
  const indoor = walk.hops.some((hop) => hop.kind === "indoor");
  const lawn = walk.hops.some((hop) => /Cut|mall|Mall|lawn/i.test(hop.label));
  if (indoor && lawn) return "via indoor bridges, then The Cut";
  if (indoor) return "via indoor bridges";
  if (lawn) return "via The Cut";
  return null;
}

export function campusExit(nodeId: string): CampusExit | undefined {
  return EXIT_BY_ID.get(nodeId);
}

export function campusNodeLngLat(nodeId: string): LngLat | null {
  return nodeLngLat(nodeId);
}
