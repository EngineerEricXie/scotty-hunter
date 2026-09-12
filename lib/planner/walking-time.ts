import { APP_CONFIG } from "@/lib/config";
import { haversineMeters } from "@/lib/maps/geo";
import { getBuilding } from "@/lib/maps/buildings";

/**
 * Walking-time estimate from building coordinates.
 * Assumption: 80 m/min (~4.8 km/h), a conservative campus walking speed
 * that includes hills, stairs, and waiting at doors. Isolated so a future
 * routing provider can replace this function without touching the planner.
 */
export function walkingMinutesBetween(
  fromBuildingId: string | null | undefined,
  toBuildingId: string | null | undefined,
): number {
  if (!fromBuildingId || !toBuildingId) return 8;
  if (fromBuildingId === toBuildingId) return 2;

  const from = getBuilding(fromBuildingId);
  const to = getBuilding(toBuildingId);
  if (!from || !to) return 10;

  const meters = haversineMeters(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );
  const minutes = meters / APP_CONFIG.walkingMetersPerMinute;
  return Math.max(2, Math.round(minutes));
}

export function walkingMetersBetween(
  fromBuildingId: string | null | undefined,
  toBuildingId: string | null | undefined,
): number | null {
  const from = getBuilding(fromBuildingId);
  const to = getBuilding(toBuildingId);
  if (!from || !to) return null;
  return Math.round(
    haversineMeters(from.latitude, from.longitude, to.latitude, to.longitude),
  );
}
