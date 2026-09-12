"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { APP_CONFIG, CMU_MAP_CENTER } from "@/lib/config";
import { getBuilding } from "@/lib/maps/buildings";
import type { Event } from "@/lib/types";
import { createFoodMarkerElement, createStartMarkerElement } from "@/components/map/FoodMarker";
import { addBuildingLayer, highlightBuilding } from "@/components/map/BuildingLayer";
import { ScottyWanderer } from "@/components/map/ScottyWanderer";
import { CMU_CAMPUS_RING } from "@/lib/maps/campus-mask";
import { isNowGoing } from "@/lib/scotty/state";
import {
  clusterEvents,
  clusterHourLabel,
  pickClusterRepresentative,
} from "@/lib/maps/cluster-events";
import { mealStopByEventId, mealRouteDrawCoordinates, type MealRouteStop } from "@/lib/maps/meal-route";
import { addFootwayLayer } from "@/lib/maps/road-graph";

const OSM_FALLBACK = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function CampusMap({
  events,
  selectedId,
  plannedIds = [],
  showRoute = false,
  routeStops = [],
  onOpen,
  onScottyClick,
}: {
  events: Event[];
  selectedId: string | null;
  plannedIds?: string[];
  showRoute?: boolean;
  routeStops?: MealRouteStop[];
  onOpen: (events: Event[]) => void;
  onScottyClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const startMarkerRef = useRef<Marker | null>(null);
  const eventsRef = useRef(events);
  const selectedRef = useRef(selectedId);
  const plannedRef = useRef(plannedIds);
  const showRouteRef = useRef(showRoute);
  const routeStopsRef = useRef(routeStops);
  const onOpenRef = useRef(onOpen);
  const [mapReady, setMapReady] = useState(false);
  const lureBuildingIds = useMemo(
    () =>
      [...new Set(events.map((event) => event.building_id).filter((id): id is string => Boolean(id)))],
    [events],
  );
  eventsRef.current = events;
  selectedRef.current = selectedId;
  plannedRef.current = plannedIds;
  showRouteRef.current = showRoute;
  routeStopsRef.current = routeStops;
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: APP_CONFIG.mapStyleUrl,
      center: [CMU_MAP_CENTER.longitude, CMU_MAP_CENTER.latitude],
      zoom: CMU_MAP_CENTER.zoom,
      pitch: CMU_MAP_CENTER.pitch,
      bearing: CMU_MAP_CENTER.bearing,
      renderWorldCopies: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new NavigationControl({ visualizePitch: false, showCompass: true }), "bottom-right");
    mapRef.current = map;

    let receivedTile = false;
    const onTile = (...args: unknown[]) => {
      const event = args[0] as { tile?: unknown };
      if (event?.tile) receivedTile = true;
    };
    map.on("data", onTile);

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
      try {
        addBuildingLayer(map);
      } catch {
        // Raster basemap still works if GeoJSON workers are unavailable.
      }
      try {
        addFootwayLayer(map);
      } catch {
        // OSM raster fallback still shows carto sidewalks if vector layers are missing.
      }
      renderMarkers();
      setMapReady(true);
    };
    map.on("load", attachOverlays);
    map.on("style.load", attachOverlays);
    map.on("moveend", renderMarkers);

    const fallbackTimer = window.setTimeout(() => {
      if (!receivedTile) {
        map.setStyle(OSM_FALLBACK as never);
      }
    }, 1800);

    map.once("error", () => {
      if (!map.isStyleLoaded()) {
        map.setStyle(OSM_FALLBACK as never);
      }
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      window.clearTimeout(fallbackTimer);
      map.off("data", onTile);
      map.off("load", attachOverlays);
      map.off("style.load", attachOverlays);
      map.off("moveend", renderMarkers);
      ro.disconnect();
      clearMarkers();
      map.remove();
      mapRef.current = null;
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
    if (!map) return;
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
      const planned = cluster.events.some((event) => plannedRef.current.includes(event.id));
      const selected = cluster.events.some((event) => event.id === selectedRef.current);
      const stopEvent = cluster.events.find((event) => stopByEvent.has(event.id));
      const el = createFoodMarkerElement(representative, selected, planned, {
        count: cluster.events.length,
        hourLabel: clusterHourLabel(cluster),
        stopNumber:
          showRouteRef.current && stopEvent ? stopByEvent.get(stopEvent.id) : undefined,
      });
      if (cluster.events.some((event) => isNowGoing(event.id))) el.dataset.going = "true";
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
      const startMarker = new Marker({ element: createStartMarkerElement(), anchor: "bottom" })
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
        highlightBuilding(map, building.id);
      }
    } else if (map) {
      highlightBuilding(map, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedId, plannedIds, showRoute, routeStops]);

  return (
    <div className="absolute inset-0" role="application" aria-label="Carnegie Mellon campus map">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {mapReady && mapRef.current ? (
        <>
          <CampusWashOverlay
            map={mapRef.current}
            routeStops={showRoute ? routeStops : []}
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

function CampusWashOverlay({
  map,
  routeStops,
}: {
  map: MapLibreMap;
  routeStops: MealRouteStop[];
}) {
  const [frame, setFrame] = useState({ wash: "", outline: "", route: "", w: 0, h: 0 });

  useEffect(() => {
    const redraw = () => {
      const canvas = map.getCanvas();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const hole = CMU_CAMPUS_RING.map(([lng, lat], index) => {
        const point = map.project([lng, lat]);
        return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      }).join(" ") + " Z";
      const projectLine = (coords: [number, number][]) =>
        coords
          .map(([lng, lat], index) => {
            const point = map.project([lng, lat]);
            return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
          })
          .join(" ");
      const routeCoords = mealRouteDrawCoordinates(routeStops);
      const route = routeCoords.length >= 2 ? projectLine(routeCoords) : "";
      setFrame({
        w,
        h,
        wash: `M0 0H${w}V${h}H0Z ${hole}`,
        outline: hole,
        route,
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
      <path d={frame.wash} fill="#c9c3b8" fillOpacity="0.88" fillRule="evenodd" />
      <path d={frame.outline} fill="none" stroke="#c41230" strokeWidth="2.75" />
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
