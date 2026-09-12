import type { Event, LocationStatus, RegistrationStatus } from "@/lib/types";

export function locationStatusFromConfidence(confidence: number | null): LocationStatus {
  if (confidence == null || confidence <= 0) return "UNKNOWN";
  if (confidence >= 0.8) return "RESOLVED";
  return "PARTIAL";
}

export function registrationStatusFromEvent(event: {
  registration_required?: boolean | null;
  registration_url?: string | null;
  registration_deadline?: string | null;
}): RegistrationStatus {
  if (event.registration_required === true) return "REQUIRED";
  if (event.registration_required === false) return "NOT_REQUIRED";
  return "UNKNOWN";
}

export function withEventDefaults<T extends Partial<Event> & Pick<Event, "id" | "title" | "start_time">>(
  partial: T,
): Event {
  const registration_required = partial.registration_required ?? false;
  const location_confidence = partial.location_confidence ?? null;
  return {
    source_id: "test",
    source_external_id: null,
    description: "",
    organizer: null,
    end_time: null,
    timezone: "America/New_York",
    source_url: null,
    source_type: "manual",
    venue_raw: null,
    building_id: null,
    room: null,
    floor: null,
    location_confidence,
    food_status: "EXPLICIT",
    food_types: [],
    food_confidence: 0,
    food_evidence: null,
    registration_required,
    registration_url: null,
    registration_deadline: null,
    eligibility: null,
    capacity_notes: null,
    raw_content_hash: null,
    extraction_version: "test",
    provenance_note: "test",
    fingerprint: partial.id,
    last_checked_at: new Date(0).toISOString(),
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    ...partial,
    food_items: partial.food_items ?? [],
    cuisine_tags: partial.cuisine_tags ?? [],
    dietary_tags: partial.dietary_tags ?? [],
    event_types: partial.event_types ?? [],
    location_status:
      partial.location_status ??
      locationStatusFromConfidence(partial.location_confidence ?? location_confidence),
    registration_status:
      partial.registration_status ??
      registrationStatusFromEvent({
        registration_required: partial.registration_required ?? registration_required,
        registration_url: partial.registration_url,
        registration_deadline: partial.registration_deadline,
      }),
  };
}
