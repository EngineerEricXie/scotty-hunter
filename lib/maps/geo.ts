import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { Building } from "@/lib/types";
import { BUILDINGS } from "@/lib/maps/buildings";

const METERS_PER_DEG_LAT = 111_320;

function offsetBox(
  lng: number,
  lat: number,
  widthM: number,
  heightM: number,
): Polygon {
  const dLat = heightM / 2 / METERS_PER_DEG_LAT;
  const dLng =
    widthM / 2 / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - dLng, lat - dLat],
        [lng + dLng, lat - dLat],
        [lng + dLng, lat + dLat],
        [lng - dLng, lat + dLat],
        [lng - dLng, lat - dLat],
      ],
    ],
  };
}

export function buildingFeature(building: Building): Feature<Polygon> {
  return {
    type: "Feature",
    id: building.geojson_feature_id,
    properties: {
      id: building.id,
      name: building.name,
      short_name: building.short_name,
      height: building.height_meters,
      off_campus: building.off_campus,
    },
    geometry: offsetBox(
      building.longitude,
      building.latitude,
      building.footprint_width_m,
      building.footprint_height_m,
    ),
  };
}

export function buildingsGeoJSON(): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: BUILDINGS.filter((b) => !b.off_campus).map(buildingFeature),
  };
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
