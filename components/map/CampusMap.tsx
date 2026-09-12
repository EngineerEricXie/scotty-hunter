"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CMU_MAP_CENTER } from "@/lib/config";
import { getBuilding } from "@/lib/maps/buildings";
import type { Event } from "@/lib/types";
import { createFoodMarkerElement } from "@/components/map/FoodMarker";
import { addBuildingLayer, highlightBuilding } from "@/components/map/BuildingLayer";
import { isNowGoing } from "@/lib/scotty/state";

const OSM_FALLBACK = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function CampusMap({
  events,
  selectedId,
  onSelect,
}: {
  events: Event[];
  selectedId: string | null;
  onSelect: (event: Event) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const eventsRef = useRef(events);
  const selectedRef = useRef(selectedId);
  eventsRef.current = events;
  selectedRef.current = selectedId;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_FALLBACK as never,
      center: [CMU_MAP_CENTER.longitude, CMU_MAP_CENTER.latitude],
      zoom: CMU_MAP_CENTER.zoom,
      pitch: 0,
      bearing: 0,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), "bottom-right");
    mapRef.current = map;

    const onLoad = () => {
      map.resize();
      addBuildingLayer(map);
      renderMarkers();
    };
    map.on("load", onLoad);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderMarkers() {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    for (const event of eventsRef.current) {
      const building = getBuilding(event.building_id);
      if (!building) continue;
      const el = createFoodMarkerElement(event, event.id === selectedRef.current);
      if (isNowGoing(event.id)) el.dataset.going = "true";
      el.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onSelect(event);
      });
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([building.longitude, building.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }

  useEffect(() => {
    renderMarkers();
    const selected = events.find((event) => event.id === selectedId);
    const map = mapRef.current;
    if (selected && map) {
      const building = getBuilding(selected.building_id);
      if (building) {
        map.easeTo({
          center: [building.longitude, building.latitude],
          zoom: Math.max(map.getZoom(), 16.4),
          duration: 650,
        });
        highlightBuilding(map, building.id);
      }
    } else if (map) {
      highlightBuilding(map, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      role="application"
      aria-label="Geographic Carnegie Mellon campus map"
    />
  );
}
