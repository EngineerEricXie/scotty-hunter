import { APP_TIMEZONE } from "@/lib/config";
import { sha256 } from "@/lib/hash";
import { eventFingerprint } from "@/lib/dedup/fingerprint";
import { normalizeLocation } from "@/lib/extraction/normalize-location";
import { zonedWallTimeToIso } from "@/lib/timezone";
import type { Event } from "@/lib/types";
import { DEMO_SEEDS, type Seed } from "@/data/fixtures/demo-seeds";
import { extractFoodMetadata } from "@/lib/extraction/classify-food";
import {
  locationStatusFromConfidence,
  registrationStatusFromEvent,
} from "@/lib/personalization/event-fields";

const STAMP = "2026-09-10T16:00:00.000Z";


function ny(date: string, hm: [number, number]): string {
  const [year, month, day] = date.split("-").map(Number);
  return zonedWallTimeToIso(year, month, day, hm[0], hm[1]);
}

function fromSeed(seed: Seed): Event {
  const location = normalizeLocation(seed.venue);
  const start = ny(seed.date, seed.start);
  const end = seed.end ? ny(seed.date, seed.end) : null;
  const fingerprint = eventFingerprint({
    title: seed.title,
    startTime: start,
    organizer: seed.organizer,
    buildingId: location.building_id,
    sourceUrl: seed.source_url ?? null,
  });
  const meta = extractFoodMetadata(`${seed.title}\n${seed.description}\n${seed.food_evidence ?? ""}`);
  const registration_required = seed.registration_required ?? false;
  return {
    id: seed.id,
    source_id: seed.source_id,
    source_external_id: seed.id,
    title: seed.title,
    description: seed.description,
    organizer: seed.organizer,
    start_time: start,
    end_time: end,
    timezone: APP_TIMEZONE,
    source_url: seed.source_url ?? null,
    source_type: seed.source_type,
    venue_raw: location.venue_raw,
    building_id: location.building_id,
    room: location.room,
    floor: location.floor,
    location_confidence: location.resolution_confidence,
    location_status: locationStatusFromConfidence(location.resolution_confidence),
    food_status: seed.food_status,
    food_types: seed.food_types,
    food_items: [...new Set([...(seed.food_items ?? []), ...meta.items])],
    cuisine_tags: [...new Set([...(seed.cuisine_tags ?? []), ...meta.cuisine_tags])],
    dietary_tags: [...new Set([...(seed.dietary_tags ?? []), ...meta.dietary_tags])],
    food_confidence: seed.food_confidence,
    food_evidence: seed.food_evidence,
    registration_required,
    registration_status: registrationStatusFromEvent({
      registration_required,
      registration_url: seed.registration_url,
      registration_deadline: seed.registration_deadline,
    }),
    registration_url: seed.registration_url ?? null,
    registration_deadline: seed.registration_deadline ?? null,
    event_types: seed.event_types ?? [],
    eligibility: seed.eligibility ?? null,
    capacity_notes: seed.capacity_notes ?? null,
    raw_content_hash: sha256(`${seed.id}|${seed.title}|${start}`),
    extraction_version: "seed-v1",
    provenance_note: seed.provenance_note,
    fingerprint,
    last_checked_at: STAMP,
    created_at: STAMP,
    updated_at: STAMP,
  };
}


export const DEMO_SEEDED_EVENTS: Event[] = DEMO_SEEDS.map(fromSeed);
