import { BUILDINGS } from "@/lib/maps/buildings";
import type { Building } from "@/lib/types";

/** Tight Carnegie Mellon campus window used by the pixel map. */
export const CAMPUS_BOUNDS = {
  minLat: 40.44035,
  maxLat: 40.44555,
  minLng: -79.94795,
  maxLng: -79.94055,
} as const;

export const PIXEL_WORLD = {
  width: 920,
  height: 1100,
} as const;

export interface PixelPoint {
  x: number;
  y: number;
}

export function projectCampus(lat: number, lng: number): PixelPoint {
  const x =
    ((lng - CAMPUS_BOUNDS.minLng) /
      (CAMPUS_BOUNDS.maxLng - CAMPUS_BOUNDS.minLng)) *
    100;
  const y =
    ((CAMPUS_BOUNDS.maxLat - lat) /
      (CAMPUS_BOUNDS.maxLat - CAMPUS_BOUNDS.minLat)) *
    100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(96, Math.max(4, y)),
  };
}

export function projectBuilding(building: Building): PixelPoint {
  if (building.off_campus) {
    return { x: 10, y: 7 };
  }
  return projectCampus(building.latitude, building.longitude);
}

export const BUILDING_PIXEL: Record<
  string,
  { fill: string; roof: string; w: number; h: number; label: string }
> = {
  ghc: { fill: "#3a3348", roof: "#f0c14a", w: 92, h: 70, label: "GATES" },
  nsh: { fill: "#8a3d32", roof: "#5c241c", w: 78, h: 58, label: "NSH" },
  wean: { fill: "#6b4a32", roof: "#3f2a1c", w: 70, h: 86, label: "WEAN" },
  doherty: { fill: "#b85a32", roof: "#7a3018", w: 64, h: 74, label: "DH" },
  hamburg: { fill: "#c4a574", roof: "#7d6240", w: 72, h: 52, label: "HBH" },
  cuc: { fill: "#f3e6c4", roof: "#c41230", w: 96, h: 72, label: "CUC" },
  hunt: { fill: "#5b4a78", roof: "#2d243f", w: 58, h: 88, label: "HUNT" },
  tepper: { fill: "#4d7ea8", roof: "#1f3d5c", w: 102, h: 78, label: "TEPPER" },
  posner: { fill: "#8d8a84", roof: "#4a4742", w: 56, h: 48, label: "POSNER" },
  craig: { fill: "#d9b48a", roof: "#8a5a32", w: 48, h: 40, label: "CRAIG" },
};

export function pixelStyle(buildingId: string) {
  return (
    BUILDING_PIXEL[buildingId] ?? {
      fill: "#6e6a62",
      roof: "#333",
      w: 56,
      h: 48,
      label: buildingId.toUpperCase(),
    }
  );
}

export function campusBuildings(): Building[] {
  return BUILDINGS;
}
