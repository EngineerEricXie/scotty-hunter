"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { APP_CONFIG, CMU_MAP_CENTER } from "@/lib/config";
import { ScottyWanderer } from "@/components/map/ScottyWanderer";
import { CMU_CAMPUS_RING } from "@/lib/maps/campus-mask";
import { addFootwayLayer } from "@/lib/maps/road-graph";
import { VIEWPORT_SYNC_EVENT } from "@/lib/ui/viewport-sync";

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

export function CampusMap({ onScottyClick }: { onScottyClick?: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [readyMap, setReadyMap] = useState<MapLibreMap | null>(null);
  const mapReady = readyMap !== null;
  const [mapUnavailable, setMapUnavailable] = useState(false);

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
    const prepareMap = () => {
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
      map.off("load", prepareMap);
      map.off("style.load", prepareMap);
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

  return (
    <div
      className="absolute inset-0"
      role="application"
      aria-label="Carnegie Mellon campus map"
      data-map-ready={mapReady}
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
  for (const [lng, lat] of CMU_CAMPUS_RING) {
    bounds.extend([lng, lat]);
  }
  return bounds;
}
