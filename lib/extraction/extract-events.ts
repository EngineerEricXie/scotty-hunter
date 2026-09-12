import { APP_TIMEZONE } from "@/lib/config";
import { sha256, shortId } from "@/lib/hash";
import { classifyFood } from "@/lib/extraction/classify-food";
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
    now?: Date;
  },
): Event | null {
  if (!extraction.startTime) return null;

  const location = normalizeLocation(
    [extraction.venueRaw, extraction.room].filter(Boolean).join(" "),
  );
  const food = extraction.food.evidence
    ? extraction.food
    : classifyFood(
        [extraction.title, extraction.description, extraction.food.evidence]
          .filter(Boolean)
          .join("\n"),
      );

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
    food_status: food.status,
    food_types: food.types,
    food_confidence: food.confidence,
    food_evidence: food.evidence,
    registration_required: extraction.registration.required === true,
    registration_url: extraction.registration.url,
    registration_deadline: extraction.registration.deadline,
    eligibility: null,
    capacity_notes: null,
    raw_content_hash: sha256(
      `${extraction.title}|${extraction.startTime}|${extraction.description ?? ""}`,
    ),
    extraction_version: EXTRACTION_VERSION,
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
      }),
    )
    .filter((event): event is Event => event !== null);
}
