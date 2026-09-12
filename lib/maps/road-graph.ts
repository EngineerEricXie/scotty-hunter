import type { FeatureCollection, LineString } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import footwayCollection from "@/data/geo/cmu-footways.json";
import { pointInCampus } from "@/lib/maps/campus-mask";
import { haversineMeters } from "@/lib/maps/geo";

export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export interface RoadEdge {
  id: number;
  points: GeoPoint[];
  start: string;
  end: string;
}

const FOOTWAYS = footwayCollection as FeatureCollection<LineString>;

/** ~8m grid so nearby OSM footway ends join at crossings. */
export function roadNodeKey(point: GeoPoint): string {
  return `${Math.round(point.latitude / 0.000072)}:${Math.round(point.longitude / 0.000094)}`;
}

function cleanLine(raw: GeoPoint[]): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (const point of raw) {
    const last = points[points.length - 1];
    if (last && last.longitude === point.longitude && last.latitude === point.latitude) continue;
    points.push(point);
  }
  return points;
}

function lineLength(points: GeoPoint[]): number {
  let meters = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    meters += haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return meters;
}

export function linesFromFootwayCollection(
  collection: FeatureCollection<LineString>,
): GeoPoint[][] {
  const lines: GeoPoint[][] = [];
  for (const feature of collection.features) {
    if (feature.geometry?.type !== "LineString") continue;
    const raw = cleanLine(
      feature.geometry.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })),
    );
    let current: GeoPoint[] = [];
    const flush = () => {
      if (current.length >= 2 && lineLength(current) >= 6) lines.push(current);
      current = [];
    };
    for (const point of raw) {
      if (pointInCampus(point.longitude, point.latitude)) {
        current.push(point);
      } else {
        flush();
      }
    }
    flush();
  }
  return lines;
}

export function stitchRoadGraph(lines: GeoPoint[][]): RoadEdge[] {
  return lines.map((points, id) => ({
    id,
    points,
    start: roadNodeKey(points[0]!),
    end: roadNodeKey(points[points.length - 1]!),
  }));
}

let cached: RoadEdge[] | null = null;

/** OSM footways/paths drawn as the thin red dashed sidewalks on campus. */
export function campusFootwayGraph(): RoadEdge[] {
  cached ??= stitchRoadGraph(linesFromFootwayCollection(FOOTWAYS));
  return cached;
}

function footwayCollectionForMap(): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: campusFootwayGraph().map((edge) => ({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: edge.points.map((point) => [point.longitude, point.latitude]),
      },
    })),
  };
}

/** Paint OSM sidewalks as the thin red dashed lines Scotty walks. */
export function addFootwayLayer(map: MapLibreMap) {
  styleMapFootways(map);
  if (!map.getSource("cmu-footways")) {
    map.addSource("cmu-footways", { type: "geojson", data: footwayCollectionForMap() });
  }
  if (map.getLayer("cmu-footways")) return;
  map.addLayer({
    id: "cmu-footways",
    type: "line",
    source: "cmu-footways",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#c41230",
      "line-dasharray": [2, 1.4],
      "line-opacity": 0.95,
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.15, 18, 2.1],
    },
  });
}

export function styleMapFootways(map: MapLibreMap) {
  for (const layer of ["road_path_pedestrian", "bridge_path_pedestrian", "tunnel_path_pedestrian"]) {
    if (!map.getLayer(layer)) continue;
    map.setPaintProperty(layer, "line-color", "#c41230");
    map.setPaintProperty(layer, "line-dasharray", [2, 1.4]);
    map.setPaintProperty(layer, "line-width", 1.35);
  }
}

export function edgesTouching(edges: RoadEdge[], key: string, exceptId?: number): RoadEdge[] {
  return edges.filter((edge) => edge.id !== exceptId && (edge.start === key || edge.end === key));
}

export function nearestRoadHit(
  edges: RoadEdge[],
  longitude: number,
  latitude: number,
): { edge: RoadEdge; index: number; point: GeoPoint } | null {
  let best: { edge: RoadEdge; index: number; point: GeoPoint } | null = null;
  let bestMeters = Infinity;
  for (const edge of edges) {
    for (let index = 0; index < edge.points.length; index++) {
      const point = edge.points[index];
      if (!point) continue;
      const meters = haversineMeters(latitude, longitude, point.latitude, point.longitude);
      if (meters < bestMeters) {
        bestMeters = meters;
        best = { edge, index, point };
      }
    }
  }
  return best;
}

export function nearestRoadEdge(edges: RoadEdge[], longitude: number, latitude: number): RoadEdge | null {
  return nearestRoadHit(edges, longitude, latitude)?.edge ?? null;
}

export function directedRoadPoints(edge: RoadEdge, fromKey: string): GeoPoint[] {
  if (edge.start === fromKey) return edge.points;
  if (edge.end === fromKey) return [...edge.points].reverse();
  return edge.points;
}

export function roadEndKey(edge: RoadEdge, fromKey: string): string {
  if (edge.start === fromKey) return edge.end;
  if (edge.end === fromKey) return edge.start;
  return edge.end;
}
