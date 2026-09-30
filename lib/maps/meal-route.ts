import type { Feature, FeatureCollection, LineString } from "geojson";
import type { Event } from "@/lib/types";
import { getBuilding, getBuildingMapLocation } from "@/lib/maps/buildings";
import { pointInCampus } from "@/lib/maps/campus-mask";
import { campusFootwayGraph } from "@/lib/maps/road-graph";
import {
  buildRouteNetwork,
  routeOnNetwork,
  type NetworkRouteFailure,
  type RouteCoordinate,
  type RouteNetwork,
} from "@/lib/maps/route-network";
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
  /** Used by the legacy single-line adapter to avoid joining missing legs. */
  routeBreakBefore?: boolean;
}

export interface MealRouteInput {
  events: Event[];
  plannedIds: string[];
  date: string;
  startBuildingId: string;
}

export type MealRouteFailure =
  NetworkRouteFailure | "unknown-building" | "off-campus" | "outside-coverage";

export interface MealRouteDiagnostic {
  legIndex: number;
  fromBuildingId: string | null;
  toBuildingId: string | null;
  reason: MealRouteFailure;
  endpoint?: "from" | "to";
  nearestDistanceMeters?: number;
  message: string;
}

export interface MealRouteLeg {
  index: number;
  fromBuildingId: string | null;
  toBuildingId: string | null;
  fromOrder: number;
  toOrder: number;
  status: "resolved" | "unresolved";
  coordinates: RouteCoordinate[];
  distanceMeters: number | null;
  reason?: MealRouteFailure;
  fromSnapDistanceMeters?: number;
  toSnapDistanceMeters?: number;
}

export interface MealRoutePreview {
  stops: MealRouteStop[];
  legs: MealRouteLeg[];
  lines: FeatureCollection<LineString>;
  diagnostics: MealRouteDiagnostic[];
  status: "empty" | "complete" | "partial" | "unavailable";
  accuracyNote: string;
}

interface ItineraryStop {
  order: number;
  kind: "start" | "meal";
  buildingId: string | null;
  eventId?: string;
  title?: string;
}

const ACCURACY_NOTE =
  "Approximate path preview on mapped sidewalks. Building pins are footprint centers, not entrances. Connections to entrances and unmapped legs are not shown.";

const FAILURE_MESSAGES: Record<MealRouteFailure, string> = {
  "unknown-building":
    "The venue has no verified building location; this leg is not drawn.",
  "off-campus":
    "This venue is outside the campus walking network; this leg is not drawn.",
  "outside-coverage":
    "The venue is outside the mapped sidewalk coverage; this leg is not drawn.",
  "invalid-coordinate": "A location is invalid; this leg is not drawn.",
  "empty-network": "No mapped sidewalks are available; this leg is not drawn.",
  "outside-snap-distance":
    "The venue is too far from a mapped sidewalk; this leg is not drawn.",
  "ambiguous-network":
    "Nearby sidewalks have ambiguous connectivity; this leg is not drawn.",
  "disconnected-network":
    "The mapped sidewalks do not connect these stops; this leg is not drawn.",
};

let cachedNetwork: RouteNetwork | undefined;
function campusRouteNetwork(): RouteNetwork {
  cachedNetwork ??= buildRouteNetwork(campusFootwayGraph());
  return cachedNetwork;
}

function itinerary(input: MealRouteInput): ItineraryStop[] {
  const plannedIds = new Set(input.plannedIds);
  const meals = input.events
    .filter((event) => {
      if (!plannedIds.has(event.id)) return false;
      const start = new Date(event.start_time);
      return Number.isFinite(start.getTime()) && calendarDateInZone(start) === input.date;
    })
    .sort(
      (a, b) =>
        Date.parse(a.start_time) - Date.parse(b.start_time) || a.id.localeCompare(b.id),
    );
  if (!meals.length) return [];
  const stops: ItineraryStop[] = [
    { order: 0, kind: "start", buildingId: input.startBuildingId },
    ...meals.map((event, index) => ({
      order: index + 1,
      kind: "meal" as const,
      buildingId: event.building_id,
      eventId: event.id,
      title: event.title,
    })),
  ];
  if (
    stops[0]?.buildingId &&
    stops[0].buildingId === stops[1]?.buildingId &&
    coverageFailure(stops[0]) === null
  )
    stops.shift();
  return stops;
}

function marker(stop: ItineraryStop): MealRouteStop | null {
  const location = getBuildingMapLocation(stop.buildingId);
  if (!location || !stop.buildingId) return null;
  return {
    ...stop,
    buildingId: stop.buildingId,
    longitude: location.longitude,
    latitude: location.latitude,
    label: stop.kind === "start" ? "START" : String(stop.order),
  };
}

function coverageFailure(stop: ItineraryStop): MealRouteFailure | null {
  const building = getBuilding(stop.buildingId);
  if (building?.off_campus) return "off-campus";
  const location = getBuildingMapLocation(stop.buildingId);
  if (!building || !location) return "unknown-building";
  // The source is clipped to this mask. In particular, a nearest-sidewalk snap
  // must not pretend to cover Tepper north of Forbes outside the source area.
  if (!pointInCampus(location.longitude, location.latitude)) return "outside-coverage";
  return null;
}

/**
 * A visual preview, not entrance-to-entrance navigation. Every LineString is an
 * independent resolved leg; no LineString may bridge an unresolved venue/leg.
 */
export function buildMealRoutePreview(input: MealRouteInput): MealRoutePreview {
  const targets = itinerary(input);
  const stops = targets
    .map(marker)
    .filter((stop): stop is MealRouteStop => stop !== null);
  const legs: MealRouteLeg[] = [];
  const diagnostics: MealRouteDiagnostic[] = [];
  const lines: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: [],
  };
  for (let index = 1; index < targets.length; index += 1) {
    const from = targets[index - 1]!;
    const to = targets[index]!;
    const leg: MealRouteLeg = {
      index: index - 1,
      fromBuildingId: from.buildingId,
      toBuildingId: to.buildingId,
      fromOrder: from.order,
      toOrder: to.order,
      status: "unresolved",
      coordinates: [],
      distanceMeters: null,
    };
    legs.push(leg);
    const fromFailure = coverageFailure(from);
    const toFailure = coverageFailure(to);
    const coverageReason = fromFailure ?? toFailure;
    const result = coverageReason
      ? {
          status: "unresolved" as const,
          reason: coverageReason,
          endpoint: fromFailure ? ("from" as const) : ("to" as const),
        }
      : routeOnNetwork(
          campusRouteNetwork(),
          getBuildingMapLocation(from.buildingId)!,
          getBuildingMapLocation(to.buildingId)!,
        );
    if (result.status === "unresolved") {
      leg.reason = result.reason;
      diagnostics.push({
        legIndex: leg.index,
        fromBuildingId: from.buildingId,
        toBuildingId: to.buildingId,
        reason: result.reason,
        endpoint: result.endpoint,
        nearestDistanceMeters:
          "nearestDistanceMeters" in result ? result.nearestDistanceMeters : undefined,
        message: FAILURE_MESSAGES[result.reason],
      });
      continue;
    }
    leg.status = "resolved";
    leg.coordinates = result.coordinates;
    leg.distanceMeters = result.distanceMeters;
    leg.fromSnapDistanceMeters = result.fromSnap.distanceMeters;
    leg.toSnapDistanceMeters = result.toSnap.distanceMeters;
    if (result.coordinates.length < 2) continue;
    lines.features.push({
      type: "Feature",
      properties: {
        legIndex: leg.index,
        fromBuildingId: from.buildingId,
        toBuildingId: to.buildingId,
        fromOrder: from.order,
        toOrder: to.order,
        approximate: true,
      },
      geometry: { type: "LineString", coordinates: result.coordinates },
    });
  }
  return {
    stops,
    legs,
    lines,
    diagnostics,
    status: !targets.length
      ? "empty"
      : !diagnostics.length
        ? "complete"
        : legs.some((leg) => leg.status === "resolved")
          ? "partial"
          : "unavailable",
    accuracyNote: ACCURACY_NOTE,
  };
}

/** Compatibility adapter. Prefer buildMealRoutePreview for disconnected routes. */
export function buildMealRoute(input: MealRouteInput): MealRouteStop[] {
  const preview = buildMealRoutePreview(input);
  const expanded: MealRouteStop[] = [];
  const first = preview.stops.find(
    (stop) => stop.order === (preview.legs[0]?.fromOrder ?? preview.stops[0]?.order),
  );
  if (first) expanded.push(first);
  let routeBreakBefore = true;
  for (const leg of preview.legs) {
    if (leg.status === "resolved") {
      leg.coordinates.forEach(([longitude, latitude], index) => {
        expanded.push({
          order: -1,
          kind: "path",
          buildingId: leg.toBuildingId!,
          longitude,
          latitude,
          label: "Mapped sidewalk",
          routeBreakBefore: index === 0 && routeBreakBefore,
        });
      });
      routeBreakBefore = false;
    } else {
      routeBreakBefore = true;
    }
    const destination = preview.stops.find((stop) => stop.order === leg.toOrder);
    if (destination) expanded.push(destination);
  }
  return expanded;
}

/** Single-line callers fail closed when the itinerary has disconnected sections. */
export function mealRouteDrawCoordinates(stops: MealRouteStop[]): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  for (const stop of stops) {
    if (stop.kind !== "path") continue;
    if (stop.routeBreakBefore && coordinates.length) return [];
    const previous = coordinates[coordinates.length - 1];
    if (previous?.[0] === stop.longitude && previous[1] === stop.latitude) continue;
    coordinates.push([stop.longitude, stop.latitude]);
  }
  return coordinates.length > 1 ? coordinates : [];
}

export function mealRouteLine(stops: MealRouteStop[]): Feature<LineString> | null {
  const coordinates = mealRouteDrawCoordinates(stops);
  if (coordinates.length < 2) return null;
  return {
    type: "Feature",
    properties: { approximate: true },
    geometry: { type: "LineString", coordinates },
  };
}

export function mealStopByEventId(stops: MealRouteStop[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stop of stops) {
    if (stop.kind === "meal" && stop.eventId) map.set(stop.eventId, stop.order);
  }
  return map;
}
