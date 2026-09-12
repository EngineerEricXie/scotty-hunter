import type { Event } from "@/lib/types";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";

export function eventsOverlap(a: Event, b: Event): boolean {
  const aStart = new Date(a.start_time).getTime();
  const aEnd = new Date(a.end_time ?? a.start_time).getTime();
  const bStart = new Date(b.start_time).getTime();
  const bEnd = new Date(b.end_time ?? b.start_time).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function canAttend(
  previousEvent: Event | null,
  nextEvent: Event,
  walkingMinutes: number,
  options?: { allowExpiredRegistration?: boolean; now?: Date },
): boolean {
  const now = options?.now ?? new Date();
  if (
    !options?.allowExpiredRegistration &&
    nextEvent.registration_required &&
    nextEvent.registration_deadline &&
    new Date(nextEvent.registration_deadline).getTime() < now.getTime()
  ) {
    return false;
  }

  if (!previousEvent) return true;
  if (eventsOverlap(previousEvent, nextEvent)) return false;

  const prevEnd = new Date(previousEvent.end_time ?? previousEvent.start_time).getTime();
  const nextStart = new Date(nextEvent.start_time).getTime();
  const neededMs = walkingMinutes * 60_000;
  return nextStart - prevEnd >= neededMs;
}

export function walkingMinutesForPair(
  from: Event | { building_id: string | null },
  to: Event,
): number {
  return walkingMinutesBetween(from.building_id, to.building_id);
}
