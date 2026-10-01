"use client";

import { useEffect } from "react";
import { Marker, type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { MealRoutePreview } from "@/lib/maps/meal-route";
import { getBuilding } from "@/lib/maps/buildings";

const SOURCE = "cmu-meal-route";
const CASING = "cmu-meal-route-casing";
const LINE = "cmu-meal-route-line";

/** Each feature is one resolved footway leg; gaps never become connecting lines. */
export function MealRouteLayer({
  map,
  preview,
  visible,
}: {
  map: MapLibreMap;
  preview: MealRoutePreview;
  visible: boolean;
}) {
  useEffect(() => {
    let startMarker: Marker | null = null;
    const render = () => {
      // A serialized style exists as soon as addSource/addLayer are safe.
      // isStyleLoaded also waits for tiles and would unnecessarily delay this.
      if (!map.getStyle()) return;
      startMarker?.remove();
      startMarker = null;
      if (!map.getSource(SOURCE)) {
        map.addSource(SOURCE, { type: "geojson", data: preview.lines });
      } else {
        (map.getSource(SOURCE) as GeoJSONSource).setData(preview.lines);
      }
      if (!map.getLayer(CASING)) {
        map.addLayer({
          id: CASING,
          type: "line",
          source: SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#fffdf8", "line-width": 8, "line-opacity": 0.95 },
        });
      }
      if (!map.getLayer(LINE)) {
        map.addLayer({
          id: LINE,
          type: "line",
          source: SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#126c86", "line-width": 4, "line-dasharray": [3, 1.5] },
        });
      }
      const shown = visible && preview.lines.features.length > 0;
      map.setLayoutProperty(CASING, "visibility", shown ? "visible" : "none");
      map.setLayoutProperty(LINE, "visibility", shown ? "visible" : "none");
      const start = preview.stops.find((stop) => stop.kind === "start");
      if (shown && start) {
        const element = document.createElement("div");
        element.className = "route-start-marker";
        element.textContent = `START · ${getBuilding(start.buildingId)?.short_name ?? start.buildingId}`;
        element.setAttribute("role", "img");
        element.setAttribute(
          "aria-label",
          `Route start near ${getBuilding(start.buildingId)?.name ?? start.buildingId}; approximate building location`,
        );
        startMarker = new Marker({ element, anchor: "bottom" })
          .setLngLat([start.longitude, start.latitude])
          .addTo(map);
      }
    };
    map.on("style.load", render);
    render();
    return () => {
      map.off("style.load", render);
      startMarker?.remove();
      if (map.getLayer(LINE)) map.removeLayer(LINE);
      if (map.getLayer(CASING)) map.removeLayer(CASING);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [map, preview, visible]);
  return null;
}
