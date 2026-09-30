"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { APP_CONFIG, CMU_MAP_CENTER } from "@/lib/config";
import { assetPath } from "@/lib/runtime";
import { ScottyWanderer } from "@/components/map/ScottyWanderer";
import { MealRouteLayer } from "@/components/map/MealRouteLayer";
import { mealStopByEventId, type MealRoutePreview } from "@/lib/maps/meal-route";
import { addFootwayLayer } from "@/lib/maps/road-graph";
import {
  campusFrameCoordinates,
  mapFramePadding,
  shouldFrameCampus,
  type CampusFrameState,
} from "@/lib/maps/map-framing";
import { VIEWPORT_SYNC_EVENT } from "@/lib/ui/viewport-sync";

import type { Event } from "@/lib/types";
import {
  clusterEvents,
  clusterHourLabel,
  pickClusterRepresentative,
} from "@/lib/maps/cluster-events";
import { createFoodMarkerElement } from "@/components/map/FoodMarker";

const NO_LURES: string[] = [];

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
  plannedIds,
  pinsVisible,
  routePreview,
  showRoute,
  onOpen,
  onScottyClick,
}: {
  events: Event[];
  selectedId: string | null;
  plannedIds: string[];
  pinsVisible: boolean;
  routePreview: MealRoutePreview;
  showRoute: boolean;
  onOpen: (events: Event[]) => void;
  onScottyClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [readyMap, setReadyMap] = useState<MapLibreMap | null>(null);
  const mapReady = readyMap !== null;
  const [mapUnavailable, setMapUnavailable] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      setWorkerUrl(assetPath("/vendor/maplibre/maplibre-gl-worker.mjs"));
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
    const frameState: CampusFrameState = { signature: null, userAdjusted: false };
    let applyingFrame = false;
    const shell = containerRef.current.closest(".app-shell");
    const overlaySelectors = [
      ".discovery-heading",
      ".map-location-label",
      ".map-route-preview",
      ".map-pins-toggle",
      ".map-hint",
      ".app-navigation",
    ];
    const resizeAndFrame = () => {
      map.resize();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const overlays = { top: 0, bottom: 0 };
      for (const selector of overlaySelectors) {
        const element = shell?.querySelector<HTMLElement>(selector);
        if (!element || !element.getClientRects().length) continue;
        const obstacle = element.getBoundingClientRect();
        if (obstacle.right <= rect.left || obstacle.left >= rect.right) continue;
        if (
          selector === ".discovery-heading" ||
          obstacle.top < rect.top + rect.height / 3
        ) {
          overlays.top = Math.max(overlays.top, obstacle.bottom - rect.top);
        } else {
          overlays.bottom = Math.max(overlays.bottom, rect.bottom - obstacle.top);
        }
      }
      const padding = mapFramePadding(rect.width, rect.height, overlays);
      const signature = JSON.stringify([rect.width, rect.height, padding]);
      if (!shouldFrameCampus(frameState, signature)) return;
      try {
        const camera = map.cameraForBounds(campusLngLatBounds(), {
          padding,
          bearing: 0,
          maxZoom: 16.9,
        });
        if (!camera || !Number.isFinite(camera.zoom)) return;
        applyingFrame = true;
        map.jumpTo({ ...camera, pitch: 0 });
        // A hidden/undersized canvas or unsuccessful camera must remain retryable.
        frameState.signature = signature;
      } catch {
        // ResizeObserver and viewport notifications retry once layout is usable.
      } finally {
        applyingFrame = false;
      }
    };
    const onCameraInteraction = () => {
      if (!applyingFrame) frameState.userAdjusted = true;
    };
    map.on("dragstart", onCameraInteraction);
    map.on("zoomstart", onCameraInteraction);
    map.on("rotatestart", onCameraInteraction);
    map.on("pitchstart", onCameraInteraction);
    const prepareMap = () => {
      resizeAndFrame();
      // Only show campus path styling and Scotty after street tiles have loaded.
      if (!receivedTile) return;
      try {
        addFootwayLayer(map);
      } catch {
        // OSM raster fallback still shows carto sidewalks if vector layers are missing.
      }
      setReadyMap(map);
    };
    const onTile = (...args: unknown[]) => {
      const event = args[0] as { tile?: { state?: string } };
      if (!receivedTile && event?.tile?.state === "loaded") {
        receivedTile = true;
        setMapUnavailable(false);
        prepareMap();
      }
    };
    map.on("data", onTile);
    map.on("load", prepareMap);
    map.on("style.load", prepareMap);

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

    const ro = new ResizeObserver(resizeAndFrame);
    ro.observe(containerRef.current);
    for (const selector of overlaySelectors) {
      const element = shell?.querySelector(selector);
      if (element) ro.observe(element);
    }

    const syncViewport = resizeAndFrame;
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", syncViewport);
    visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("pageshow", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener(VIEWPORT_SYNC_EVENT, syncViewport);
    const onVisibility = () => {
      if (document.visibilityState === "visible") resizeAndFrame();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(unavailableTimer);
      map.off("error", useFallback);
      map.off("data", onTile);
      map.off("load", prepareMap);
      map.off("style.load", prepareMap);
      map.off("dragstart", onCameraInteraction);
      map.off("zoomstart", onCameraInteraction);
      map.off("rotatestart", onCameraInteraction);
      map.off("pitchstart", onCameraInteraction);
      ro.disconnect();
      visualViewport?.removeEventListener("resize", syncViewport);
      visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("pageshow", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener(VIEWPORT_SYNC_EVENT, syncViewport);
      document.removeEventListener("visibilitychange", onVisibility);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!readyMap || !pinsVisible) return;
    let markers: Marker[] = [];
    const clear = () => {
      markers.forEach((marker) => marker.remove());
      markers = [];
    };
    const render = () => {
      clear();
      const stopNumbers = mealStopByEventId(routePreview.stops);
      const clusters = clusterEvents(events, (longitude, latitude) => {
        const point = readyMap.project([longitude, latitude]);
        return { x: point.x, y: point.y };
      });
      for (const cluster of clusters) {
        const representative = pickClusterRepresentative(cluster, plannedIds, selectedId);
        const selected = cluster.events.some((event) => event.id === selectedId);
        const planned = cluster.events.some((event) => plannedIds.includes(event.id));
        const numberedEvent = cluster.events.find((event) => stopNumbers.has(event.id));
        const element = createFoodMarkerElement(representative, selected, planned, {
          count: cluster.events.length,
          hourLabel: clusterHourLabel(cluster),
          stopNumber:
            showRoute && numberedEvent ? stopNumbers.get(numberedEvent.id) : undefined,
        });
        element.dataset.buildings = [
          ...new Set(cluster.events.map((event) => event.building_id)),
        ]
          .sort()
          .join(",");
        element.addEventListener("click", () => onOpen(cluster.events));
        markers.push(
          new Marker({ element, anchor: "bottom" })
            .setLngLat([cluster.longitude, cluster.latitude])
            .addTo(readyMap),
        );
      }
    };
    render();
    readyMap.on("moveend", render);
    return () => {
      readyMap.off("moveend", render);
      clear();
    };
  }, [
    readyMap,
    events,
    selectedId,
    plannedIds,
    pinsVisible,
    onOpen,
    routePreview,
    showRoute,
  ]);

  return (
    <div
      className="absolute inset-0"
      role="application"
      aria-label="Carnegie Mellon campus map"
      data-map-ready={mapReady}
      data-route-visible={Boolean(
        mapReady && showRoute && routePreview.lines.features.length,
      )}
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
      {readyMap ? (
        <MealRouteLayer map={readyMap} preview={routePreview} visible={showRoute} />
      ) : null}
      {readyMap ? (
        <ScottyWanderer
          map={readyMap}
          lureBuildingIds={NO_LURES}
          onClick={onScottyClick}
        />
      ) : null}
    </div>
  );
}

function campusLngLatBounds(): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const coordinate of campusFrameCoordinates()) bounds.extend(coordinate);
  return bounds;
}
