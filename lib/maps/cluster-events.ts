import type { Event } from "@/lib/types";
import { getBuilding } from "@/lib/maps/buildings";
import { markerHour } from "@/lib/food-ui";

export const CLUSTER_PIXEL_THRESHOLD = 52;

export interface MapEventCluster {
  id: string;
  events: Event[];
  longitude: number;
  latitude: number;
  buildingId: string | null;
}

export function eventLngLat(event: Event): { lng: number; lat: number } | null {
  const building = getBuilding(event.building_id);
  if (!building) return null;
  return { lng: building.longitude, lat: building.latitude };
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const time = a.start_time.localeCompare(b.start_time);
    if (time !== 0) return time;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Stack events that share a building, then merge stacks whose screen
 * positions would overlap at the current zoom.
 */
export function clusterEvents(
  events: Event[],
  project?: (lng: number, lat: number) => { x: number; y: number } | null,
  pixelThreshold = CLUSTER_PIXEL_THRESHOLD,
): MapEventCluster[] {
  const byBuilding = new Map<string, Event[]>();
  for (const event of events) {
    const key = event.building_id ?? `event:${event.id}`;
    const list = byBuilding.get(key) ?? [];
    list.push(event);
    byBuilding.set(key, list);
  }

  const seeds: MapEventCluster[] = [];
  for (const [key, grouped] of byBuilding) {
    const sorted = sortEvents(grouped);
    const loc = eventLngLat(sorted[0]!);
    if (!loc) continue;
    seeds.push({
      id: key,
      events: sorted,
      longitude: loc.lng,
      latitude: loc.lat,
      buildingId: sorted[0]!.building_id,
    });
  }
  seeds.sort((a, b) => a.id.localeCompare(b.id));
  if (!project) return seeds;

  const merged: MapEventCluster[] = [];
  const used = new Set<string>();
  for (const seed of seeds) {
    if (used.has(seed.id)) continue;
    const origin = project(seed.longitude, seed.latitude);
    if (!origin) {
      merged.push(seed);
      used.add(seed.id);
      continue;
    }
    const group = [seed];
    used.add(seed.id);
    for (const other of seeds) {
      if (used.has(other.id)) continue;
      const point = project(other.longitude, other.latitude);
      if (!point) continue;
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      if (dx * dx + dy * dy <= pixelThreshold * pixelThreshold) {
        group.push(other);
        used.add(other.id);
      }
    }
    if (group.length === 1) {
      merged.push(seed);
      continue;
    }
    merged.push({
      id: group
        .map((item) => item.id)
        .sort()
        .join("+"),
      events: sortEvents(group.flatMap((item) => item.events)),
      longitude: group.reduce((sum, item) => sum + item.longitude, 0) / group.length,
      latitude: group.reduce((sum, item) => sum + item.latitude, 0) / group.length,
      buildingId: group[0]!.buildingId,
    });
  }
  return merged;
}

export function pickClusterRepresentative(
  cluster: MapEventCluster,
  plannedIds: string[],
  selectedId: string | null,
): Event {
  const selected = cluster.events.find((event) => event.id === selectedId);
  if (selected) return selected;
  const planned = cluster.events.find((event) => plannedIds.includes(event.id));
  if (planned) return planned;
  return cluster.events[0]!;
}

export function clusterHourLabel(cluster: MapEventCluster): string {
  const hours = new Set(cluster.events.map((event) => markerHour(event.start_time)));
  if (hours.size === 1) return [...hours][0]!;
  const buildingIds = new Set(
    cluster.events.map((event) => event.building_id).filter((id): id is string => Boolean(id)),
  );
  if (buildingIds.size === 1) {
    return getBuilding([...buildingIds][0]!)?.short_name ?? "HERE";
  }
  return "NEAR";
}
