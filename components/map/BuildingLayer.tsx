import type { Map as MapLibreMap } from "maplibre-gl";
import { buildingsGeoJSON } from "@/lib/maps/geo";

const SOURCE = "cmu-buildings";
const FILL = "cmu-buildings-fill";
const EXTRUSION = "cmu-buildings-extrusion";

export function addBuildingLayer(map: MapLibreMap) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, {
    type: "geojson",
    data: buildingsGeoJSON(),
  });
  map.addLayer({
    id: FILL,
    type: "fill",
    source: SOURCE,
    paint: {
      "fill-color": "#d9e2ea",
      "fill-opacity": 0.35,
    },
  });
  map.addLayer({
    id: EXTRUSION,
    type: "fill-extrusion",
    source: SOURCE,
    minzoom: 14.5,
    paint: {
      "fill-extrusion-color": "#c5d0d8",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.55,
    },
  });
}

export function highlightBuilding(map: MapLibreMap, buildingId: string | null) {
  if (!map.getLayer(EXTRUSION)) return;
  map.setPaintProperty(
    EXTRUSION,
    "fill-extrusion-color",
    buildingId
      ? [
          "case",
          ["==", ["get", "id"], buildingId],
          "#e85d4c",
          "#c5d0d8",
        ]
      : "#c5d0d8",
  );
}
