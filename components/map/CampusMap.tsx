"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { APP_CONFIG, CMU_MAP_CENTER } from "@/lib/config";
import { getBuilding } from "@/lib/maps/buildings";
import type { Event } from "@/lib/types";
import {
  createFoodMarkerElement,
  createStartMarkerElement,
} from "@/components/map/FoodMarker";
import { ScottyWanderer } from "@/components/map/ScottyWanderer";
import { CMU_CAMPUS_RING } from "@/lib/maps/campus-mask";
import {
  clusterEvents,
  clusterHourLabel,
  pickClusterRepresentative,
} from "@/lib/maps/cluster-events";
import {
  mealStopByEventId,
  mealRouteDrawCoordinates,
  type MealRouteStop,
} from "@/lib/maps/meal-route";
import { addFootwayLayer } from "@/lib/maps/road-graph";
import { VIEWPORT_SYNC_EVENT } from "@/lib/ui/viewport-sync";

const NO_ROUTE_STOPS: MealRouteStop[] = [];
const NO_IDS: string[] = [];

const OSM_FALLBACK = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function CampusMap({
  events,
  selectedId,
  plannedIds = NO_IDS,
  showRoute = false,
  routeStops = NO_ROUTE_STOPS,
  goingEventIds = NO_IDS,
  onOpen,
  onScottyClick,
}: {
  events: Event[];
  selectedId: string | null;
  plannedIds?: string[];
  showRoute?: boolean;
  routeStops?: MealRouteStop[];
  goingEventIds?: string[];
  onOpen: (events: Event[]) => void;
  onScottyClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const basemapReadyRef = useRef(false);
  const markersRef = useRef<Marker[]>([]);
  const startMarkerRef = useRef<Marker | null>(null);
  const eventsRef = useRef(events);
  const selectedRef = useRef(selectedId);
  const plannedRef = useRef(plannedIds);
  const showRouteRef = useRef(showRoute);
  const routeStopsRef = useRef(routeStops);
  const goingEventIdsRef = useRef(goingEventIds);
  const onOpenRef = useRef(onOpen);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const lureBuildingIds = useMemo(
    () => [
      ...new Set(
        events
          .map((event) => event.building_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    [events],
  );
  eventsRef.current = events;
  selectedRef.current = selectedId;
  plannedRef.current = plannedIds;
  showRouteRef.current = showRoute;
  routeStopsRef.current = routeStops;
  goingEventIdsRef.current = goingEventIds;
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: APP_CONFIG.mapStyleUrl,
        center: [CMU_MAP_CENTER.longitude, CMU_MAP_CENTER.latitude],
        zoom: CMU_MAP_CENTER.zoom,
        pitch: CMU_MAP_CENTER.pitch,
        bearing: CMU_MAP_CENTER.bearing,
        renderWorldCopies: false,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
    } catch {
      // Keep the list and planner usable when the browser cannot create WebGL.
      const unavailableTimer = window.setTimeout(() => setMapUnavailable(true), 0);
      return () => window.clearTimeout(unavailableTimer);
    }
    map.addControl(
      new NavigationControl({ visualizePitch: false, showCompass: true }),
      "bottom-right",
    );
    mapRef.current = map;

    let receivedTile = false;
    let usingFallback = false;
    let framed = false;
    const attachOverlays = () => {
      map.resize();
      if (!framed) {
        framed = true;
        map.fitBounds(campusLngLatBounds(), {
          padding: { top: 136, bottom: 148, left: 48, right: 72 },
          pitch: 0,
          bearing: 0,
          duration: 0,
          maxZoom: 16.9,
        });
        map.setPitch(0);
        map.setBearing(0);
      }
      // Never render floating markers/overlays as a substitute for a basemap.
      if (!receivedTile) return;
      try {
        addFootwayLayer(map);
      } catch {
        // OSM raster fallback still shows carto sidewalks if vector layers are missing.
      }
      renderMarkers();
      setMapReady(true);
    };
    const onTile = (...args: unknown[]) => {
      const event = args[0] as { tile?: { state?: string } };
      if (!receivedTile && event?.tile?.state === "loaded") {
        receivedTile = true;
        basemapReadyRef.current = true;
        setMapUnavailable(false);
        attachOverlays();
      }
    };
    map.on("data", onTile);
    map.on("load", attachOverlays);
    map.on("style.load", attachOverlays);
    map.on("moveend", renderMarkers);

    const useFallback = () => {
      if (receivedTile || usingFallback) return;
      usingFallback = true;
      map.setStyle(OSM_FALLBACK as never);
    };
    const fallbackTimer = window.setTimeout(useFallback, 1800);
    const unavailableTimer = window.setTimeout(() => {
      if (!receivedTile) setMapUnavailable(true);
    }, 6000);
    map.on("error", useFallback);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    const syncViewport = () => map.resize();
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", syncViewport);
    visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("pageshow", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener(VIEWPORT_SYNC_EVENT, syncViewport);
    const onVisibility = () => {
      if (document.visibilityState === "visible") map.resize();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(unavailableTimer);
      map.off("error", useFallback);
      map.off("data", onTile);
      map.off("load", attachOverlays);
      map.off("style.load", attachOverlays);
      map.off("moveend", renderMarkers);
      ro.disconnect();
      visualViewport?.removeEventListener("resize", syncViewport);
      visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("pageshow", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener(VIEWPORT_SYNC_EVENT, syncViewport);
      document.removeEventListener("visibilitychange", onVisibility);
      clearMarkers();
      map.remove();
      mapRef.current = null;
      basemapReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearMarkers() {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    startMarkerRef.current?.remove();
    startMarkerRef.current = null;
  }

  function renderMarkers() {
    const map = mapRef.current;
    if (!map || !basemapReadyRef.current) return;
    clearMarkers();
    const projector = (lng: number, lat: number) => {
      const point = map.project([lng, lat]);
      return { x: point.x, y: point.y };
    };
    const clusters = clusterEvents(eventsRef.current, projector);
    const stopByEvent = mealStopByEventId(routeStopsRef.current);
    for (const cluster of clusters) {
      const representative = pickClusterRepresentative(
        cluster,
        plannedRef.current,
        selectedRef.current,
      );
      const planned = cluster.events.some((event) =>
        plannedRef.current.includes(event.id),
      );
      const selected = cluster.events.some((event) => event.id === selectedRef.current);
      const stopEvent = cluster.events.find((event) => stopByEvent.has(event.id));
      const el = createFoodMarkerElement(representative, selected, planned, {
        count: cluster.events.length,
        hourLabel: clusterHourLabel(cluster),
        stopNumber:
          showRouteRef.current && stopEvent ? stopByEvent.get(stopEvent.id) : undefined,
      });
      if (cluster.events.some((event) => goingEventIdsRef.current.includes(event.id))) {
        el.dataset.going = "true";
      }
      el.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onOpenRef.current(cluster.events);
      });
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([cluster.longitude, cluster.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }

    const start = showRouteRef.current
      ? routeStopsRef.current.find((stop) => stop.kind === "start")
      : null;
    if (start) {
      const startMarker = new Marker({
        element: createStartMarkerElement(),
        anchor: "bottom",
      })
        .setLngLat([start.longitude, start.latitude])
        .addTo(map);
      startMarkerRef.current = startMarker;
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    renderMarkers();
    const selected = events.find((event) => event.id === selectedId);
    if (selected && map) {
      const building = getBuilding(selected.building_id);
      if (building) {
        map.easeTo({
          center: [building.longitude, building.latitude],
          zoom: Math.max(map.getZoom(), 16.6),
          pitch: 0,
          bearing: 0,
          duration: 650,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedId, plannedIds, showRoute, routeStops, goingEventIds]);

  return (
    <div
      className="absolute inset-0"
      role="application"
      aria-label="Carnegie Mellon campus map"
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!mapReady && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center p-6"
          role="status"
        >
          <p className="max-w-xs rounded-xl bg-card p-4 text-center text-sm text-ink">
            {mapUnavailable
              ? "Street map unavailable. You can still browse the event list and use the planner."
              : "Loading street map…"}
          </p>
        </div>
      )}
      {mapReady && mapRef.current ? (
        <>
          <MealRouteOverlay
            map={mapRef.current}
            routeStops={showRoute ? routeStops : NO_ROUTE_STOPS}
          />
          <ScottyWanderer
            map={mapRef.current}
            lureBuildingIds={lureBuildingIds}
            onClick={onScottyClick}
          />
        </>
      ) : null}
    </div>
  );
}

function campusLngLatBounds(): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const [lng, lat] of CMU_CAMPUS_RING) {
    bounds.extend([lng, lat]);
  }
  return bounds;
}

function MealRouteOverlay({
  map,
  routeStops,
}: {
  map: MapLibreMap;
  routeStops: MealRouteStop[];
}) {
  const [frame, setFrame] = useState({ route: "", w: 0, h: 0 });

  useEffect(() => {
    const redraw = () => {
      const canvas = map.getCanvas();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const projectLine = (coords: [number, number][]) =>
        coords
          .map(([lng, lat], index) => {
            const point = map.project([lng, lat]);
            return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
          })
          .join(" ");
      const routeCoords = mealRouteDrawCoordinates(routeStops);
      const route = routeCoords.length >= 2 ? projectLine(routeCoords) : "";
      setFrame((prev) => {
        if (prev.w === w && prev.h === h && prev.route === route) {
          return prev;
        }
        return { w, h, route };
      });
    };
    redraw();
    map.on("move", redraw);
    map.on("resize", redraw);
    return () => {
      map.off("move", redraw);
      map.off("resize", redraw);
    };
  }, [map, routeStops]);

  if (!frame.w) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      viewBox={`0 0 ${frame.w} ${frame.h}`}
      aria-hidden
    >
      {frame.route ? (
        <>
          <path
            d={frame.route}
            fill="none"
            stroke="#f4d03f"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={frame.route}
            fill="none"
            stroke="#c41230"
            strokeWidth="4"
            strokeDasharray="10 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </svg>
  );
}
