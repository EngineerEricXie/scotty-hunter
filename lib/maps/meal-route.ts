import type { Feature, LineString } from "geojson";
import type { Event } from "@/lib/types";
import { getBuilding } from "@/lib/maps/buildings";
import { campusWalk } from "@/lib/maps/campus-graph";
import { calendarDateInZone } from "@/lib/timezone";

export interface MealRouteStop {
  order: number;
  kind: "start" | "meal" | "via" | "path";
  buildingId: string;
  longitude: number;
  latitude: number;
  label: string;
  eventId?: string;
  title?: string;
}

export function buildMealRoute(input: {
  events: Event[];
  plannedIds: string[];
  date: string;
  startBuildingId: string;
}): MealRouteStop[] {
  const meals = input.events
    .filter(
      (event) =>
        input.plannedIds.includes(event.id) &&
        calendarDateInZone(new Date(event.start_time)) === input.date,
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const stops: MealRouteStop[] = [];
  const start = getBuilding(input.startBuildingId);
  if (start) {
    stops.push({
      order: 0,
      kind: "start",
      buildingId: start.id,
      longitude: start.longitude,
      latitude: start.latitude,
      label: "START",
    });
  }

  let mealOrder = 1;
  for (const event of meals) {
    const building = getBuilding(event.building_id);
    if (!building) continue;
    const previous = stops[stops.length - 1];
    if (previous?.kind === "meal" && previous.buildingId === building.id) continue;
    stops.push({
      order: mealOrder,
      kind: "meal",
      buildingId: building.id,
      longitude: building.longitude,
      latitude: building.latitude,
      label: String(mealOrder),
      eventId: event.id,
      title: event.title,
    });
    mealOrder += 1;
  }

  if (
    stops.length >= 2 &&
    stops[0]?.kind === "start" &&
    stops[1]?.buildingId === stops[0].buildingId
  ) {
    stops.shift();
  }

  return expandRouteThroughCampus(stops);
}

function expandRouteThroughCampus(stops: MealRouteStop[]): MealRouteStop[] {
  if (stops.length < 2) return stops;
  const expanded: MealRouteStop[] = [stops[0]!];
  for (let i = 1; i < stops.length; i += 1) {
    const from = expanded[expanded.length - 1]!;
    const to = stops[i]!;
    const walk = campusWalk(from.buildingId, to.buildingId);
    for (const hop of walk?.hops ?? []) {
      for (const [longitude, latitude] of hop.geometry) {
        expanded.push({
          order: -1,
          kind: "path",
          buildingId: hop.to,
          longitude,
          latitude,
          label: hop.label,
        });
      }
      if (hop.to === to.buildingId) continue;
      const building = getBuilding(hop.to);
      if (!building) continue;
      const arrived = hop.geometry[hop.geometry.length - 1];
      expanded.push({
        order: -1,
        kind: "via",
        buildingId: building.id,
        longitude: arrived?.[0] ?? building.longitude,
        latitude: arrived?.[1] ?? building.latitude,
        label: building.short_name,
      });
    }
    expanded.push(to);
  }
  return expanded;
}

export function mealRouteDrawCoordinates(stops: MealRouteStop[]): [number, number][] {
  if (stops.length < 2) return [];
  const coords: [number, number][] = [];
  for (const stop of stops) {
    const prev = coords[coords.length - 1];
    if (prev && prev[0] === stop.longitude && prev[1] === stop.latitude) continue;
    coords.push([stop.longitude, stop.latitude]);
  }
  return coords;
}

export function mealRouteLine(stops: MealRouteStop[]): Feature<LineString> | null {
  if (stops.length < 2) return null;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
    },
  };
}

export function mealStopByEventId(stops: MealRouteStop[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stop of stops) {
    if (stop.kind === "meal" && stop.eventId) map.set(stop.eventId, stop.order);
  }
  return map;
}
