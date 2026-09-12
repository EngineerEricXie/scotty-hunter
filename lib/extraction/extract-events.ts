import { APP_TIMEZONE } from "@/lib/config";
import { sha256, shortId } from "@/lib/hash";
import { classifyFood, extractFoodMetadata } from "@/lib/extraction/classify-food";
import type { EventExtraction } from "@/lib/extraction/event-schema";
import {
  canUseLlmExtractor,
  LLMEventExtractor,
} from "@/lib/extraction/llm-extractor";
import {
  getLocalExtractor,
  type EventExtractor,
  type ExtractionInput,
} from "@/lib/extraction/heuristic-extractor";
import { normalizeLocation } from "@/lib/extraction/normalize-location";
import { eventFingerprint } from "@/lib/dedup/fingerprint";
import type { Event, SourceType } from "@/lib/types";
import {
  locationStatusFromConfidence,
  registrationStatusFromEvent,
} from "@/lib/personalization/event-fields";

export const EXTRACTION_VERSION = "heuristic-v1";

export function getEventExtractor(): EventExtractor {
  if (canUseLlmExtractor()) return new LLMEventExtractor();
  return getLocalExtractor();
}

export function extractionToEvent(
  extraction: EventExtraction,
  options: {
    sourceId: string;
    sourceType: SourceType;
    sourceUrl: string | null;
    provenanceNote: string;
    extractionVersion?: string;
    now?: Date;
  },
): Event | null {
  if (!extraction.startTime) return null;

  const location = normalizeLocation(
    [extraction.venueRaw, extraction.room].filter(Boolean).join(" "),
  );
  const classified = classifyFood(
    [extraction.title, extraction.description, extraction.food.evidence]
      .filter(Boolean)
      .join("\n"),
  );
  const food = extraction.food.evidence
    ? { ...classified, ...extraction.food, evidence: extraction.food.evidence }
    : classified;
  const meta = extractFoodMetadata(
    [extraction.title, extraction.description, food.evidence].filter(Boolean).join("\n"),
  );
  const food_items = [...new Set([...(extraction.food.items ?? []), ...meta.items, ...(food.items ?? [])])];
  const cuisine_tags = [
    ...new Set([...(extraction.food.cuisineTags ?? []), ...meta.cuisine_tags, ...(food.cuisine_tags ?? [])]),
  ];
  const dietary_tags = [
    ...new Set([...(extraction.food.dietaryTags ?? []), ...meta.dietary_tags, ...(food.dietary_tags ?? [])]),
  ];

  const now = (options.now ?? new Date()).toISOString();
  const fingerprint = eventFingerprint({
    title: extraction.title,
    startTime: extraction.startTime,
    organizer: extraction.organizer,
    buildingId: location.building_id,
    sourceUrl: options.sourceUrl,
  });

  return {
    id: `evt_${shortId(fingerprint)}`,
    source_id: options.sourceId,
    source_external_id: extraction.sourceExternalId ?? null,
    title: extraction.title,
    description: extraction.description ?? "",
    organizer: extraction.organizer,
    start_time: extraction.startTime,
    end_time: extraction.endTime,
    timezone: APP_TIMEZONE,
    source_url: options.sourceUrl,
    source_type: options.sourceType,
    venue_raw: location.venue_raw || extraction.venueRaw,
    building_id: location.building_id,
    room: location.room ?? extraction.room,
    floor: location.floor,
    location_confidence: location.resolution_confidence,
    location_status: locationStatusFromConfidence(location.resolution_confidence),
    food_status: food.status,
    food_types: food.types,
    food_items,
    cuisine_tags,
    dietary_tags,
    food_confidence: food.confidence,
    food_evidence: food.evidence,
    registration_required: extraction.registration.required === true,
    registration_status: registrationStatusFromEvent({
      registration_required: extraction.registration.required,
      registration_url: extraction.registration.url,
      registration_deadline: extraction.registration.deadline,
    }),
    registration_url: extraction.registration.url,
    registration_deadline: extraction.registration.deadline,
    event_types: extraction.eventTypes ?? [],
    eligibility: null,
    capacity_notes: null,
    raw_content_hash: sha256(
      `${extraction.title}|${extraction.startTime}|${extraction.description ?? ""}`,
    ),
    extraction_version: options.extractionVersion ?? EXTRACTION_VERSION,
    provenance_note: options.provenanceNote,
    fingerprint,
    last_checked_at: now,
    created_at: now,
    updated_at: now,
  };
}

export async function extractEventsFromText(
  input: ExtractionInput,
  meta: {
    sourceId: string;
    sourceType: SourceType;
    provenanceNote: string;
  },
): Promise<Event[]> {
  const extractor = getEventExtractor();
  const extractions = await extractor.extract(input);
  return extractions
    .map((item) =>
      extractionToEvent(item, {
        sourceId: meta.sourceId,
        sourceType: meta.sourceType,
        sourceUrl: input.sourceUrl,
        provenanceNote: meta.provenanceNote,
        extractionVersion: extractor.name,
      }),
    )
    .filter((event): event is Event => event !== null);
}
