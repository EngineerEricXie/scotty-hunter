import { BUILDINGS, getBuildingMapLocation } from "@/lib/maps/buildings";
import { campusFootwayGraph } from "@/lib/maps/road-graph";

export interface MapFramePadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Fit the entire real walking network, not just the event-marker anchors. */
export function campusFrameCoordinates(): [number, number][] {
  const coordinates: [number, number][] = [];
  for (const building of BUILDINGS) {
    const location = getBuildingMapLocation(building.id);
    if (location) coordinates.push([location.longitude, location.latitude]);
  }
  for (const edge of campusFootwayGraph()) {
    for (const point of edge.points) coordinates.push([point.longitude, point.latitude]);
  }
  return coordinates;
}

/**
 * Insets are measured from the map container, including the actual UI overlays.
 * Scotty is a bottom-anchored 48px sprite with a 3px walking bob. Never give
 * MapLibre zero/negative space, even while a browser keyboard is resizing it.
 */
export function mapFramePadding(
  width: number,
  height: number,
  overlays: { top: number; bottom: number },
): MapFramePadding {
  const desired = {
    top: overlays.top + 56,
    bottom: overlays.bottom + 12,
    left: 36,
    right: 72,
  };
  const horizontalScale = Math.min(
    1,
    Math.max(0, width - Math.min(120, width / 2)) / (desired.left + desired.right),
  );
  const verticalScale = Math.min(
    1,
    Math.max(0, height - Math.min(48, height / 4)) / (desired.top + desired.bottom),
  );
  return {
    top: desired.top * verticalScale,
    bottom: desired.bottom * verticalScale,
    left: desired.left * horizontalScale,
    right: desired.right * horizontalScale,
  };
}

export interface CampusFrameState {
  signature: string | null;
  userAdjusted: boolean;
}

/** Retry unframed maps and resize auto-framed maps; never undo a user's camera. */
export function shouldFrameCampus(state: CampusFrameState, signature: string): boolean {
  return !state.userAdjusted && state.signature !== signature;
}
