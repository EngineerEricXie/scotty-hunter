import { APP_CONFIG } from "@/lib/config";
import { haversineMeters } from "@/lib/maps/geo";
import { getBuilding } from "@/lib/maps/buildings";
import { campusWalk } from "@/lib/maps/campus-graph";

/**
 * Walking-time estimate. Prefers the campus connector graph (indoor
 * walkways, The Cut crossing) and falls back to haversine for off-graph
 * buildings such as Craig Street.
 */
export function walkingMinutesBetween(
  fromBuildingId: string | null | undefined,
  toBuildingId: string | null | undefined,
): number {
  if (!fromBuildingId || !toBuildingId) return 8;
  if (fromBuildingId === toBuildingId) return 2;

  const routed = campusWalk(fromBuildingId, toBuildingId);
  if (routed) return Math.max(2, routed.minutes);

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
    haversineMeters(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    ),
  );
}
