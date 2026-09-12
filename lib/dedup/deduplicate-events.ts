import { foodStatusRank } from "@/lib/extraction/classify-food";
import { eventFingerprint } from "@/lib/dedup/fingerprint";
import type { Event } from "@/lib/types";

function completeness(event: Event): number {
  return [
    event.description,
    event.organizer,
    event.end_time,
    event.building_id,
    event.room,
    event.food_evidence,
    event.registration_url,
    event.registration_deadline,
    event.source_url,
  ].filter(Boolean).length;
}

function prefer<T>(a: T, b: T, better: (x: T, y: T) => boolean): T {
  return better(a, b) ? a : b;
}

export function mergeEvents(a: Event, b: Event): Event {
  const richerFood =
    foodStatusRank(b.food_status) > foodStatusRank(a.food_status) ||
    (b.food_status === a.food_status && b.food_confidence > a.food_confidence)
      ? b
      : a;

  const canonicalBuilding =
    (a.location_confidence ?? 0) >= (b.location_confidence ?? 0) ? a : b;

  return {
    ...a,
    title: a.title.length >= b.title.length ? a.title : b.title,
    description:
      (a.description?.length ?? 0) >= (b.description?.length ?? 0)
        ? a.description
        : b.description,
    organizer: a.organizer ?? b.organizer,
    start_time: a.start_time || b.start_time,
    end_time: a.end_time ?? b.end_time,
    source_url: a.source_url ?? b.source_url,
    venue_raw: canonicalBuilding.venue_raw,
    building_id: canonicalBuilding.building_id,
    room: canonicalBuilding.room ?? a.room ?? b.room,
    floor: canonicalBuilding.floor ?? a.floor ?? b.floor,
    location_confidence: Math.max(
      a.location_confidence ?? 0,
      b.location_confidence ?? 0,
    ),
    food_status: richerFood.food_status,
    food_types:
      richerFood.food_types.length >= a.food_types.length
        ? richerFood.food_types
        : a.food_types,
    food_confidence: richerFood.food_confidence,
    food_evidence: richerFood.food_evidence ?? a.food_evidence ?? b.food_evidence,
    registration_required: a.registration_required || b.registration_required,
    registration_url: a.registration_url ?? b.registration_url,
    registration_deadline: a.registration_deadline ?? b.registration_deadline,
    eligibility: a.eligibility ?? b.eligibility,
    capacity_notes: a.capacity_notes ?? b.capacity_notes,
    provenance_note: `${a.provenance_note} | merged with ${b.source_id}`,
    fingerprint: a.fingerprint,
    updated_at: prefer(a.updated_at, b.updated_at, (x, y) => x > y),
    last_checked_at: prefer(a.last_checked_at, b.last_checked_at, (x, y) => x > y),
  };
}

export function deduplicateEvents(events: Event[]): Event[] {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const key =
      event.fingerprint ||
      eventFingerprint({
        title: event.title,
        startTime: event.start_time,
        organizer: event.organizer,
        buildingId: event.building_id,
        sourceUrl: event.source_url,
      });
    const list = groups.get(key) ?? [];
    list.push({ ...event, fingerprint: key });
    groups.set(key, list);
  }

  const merged: Event[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => completeness(b) - completeness(a));
    merged.push(sorted.reduce((acc, next) => mergeEvents(acc, next)));
  }

  return merged.sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}
