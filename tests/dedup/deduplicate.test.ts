import { describe, expect, it } from "vitest";
import { deduplicateEvents } from "@/lib/dedup/deduplicate-events";
import { eventFingerprint } from "@/lib/dedup/fingerprint";
import type { Event } from "@/lib/types";

function base(partial: Partial<Event>): Event {
  return {
    id: "a",
    source_id: "one",
    source_external_id: null,
    title: "AI Seminar",
    description: "Short",
    organizer: "MLD",
    start_time: "2026-09-12T16:00:00.000Z",
    end_time: null,
    timezone: "America/New_York",
    source_url: "https://example.edu/event",
    source_type: "department",
    venue_raw: "GHC 4307",
    building_id: "ghc",
    room: "4307",
    floor: "4",
    location_confidence: 0.9,
    food_status: "LIKELY",
    food_types: ["lunch"],
    food_confidence: 0.7,
    food_evidence: "Refreshments will be served.",
    registration_required: false,
    registration_url: null,
    registration_deadline: null,
    eligibility: null,
    capacity_notes: null,
    raw_content_hash: null,
    extraction_version: "test",
    provenance_note: "source one",
    fingerprint: "",
    last_checked_at: "2026-09-12T00:00:00.000Z",
    created_at: "2026-09-12T00:00:00.000Z",
    updated_at: "2026-09-12T00:00:00.000Z",
    ...partial,
  };
}

describe("deduplication", () => {
  it("merges the same event from two sources", () => {
    const first = base({
      id: "a",
      fingerprint: eventFingerprint({
        title: "AI Seminar",
        startTime: "2026-09-12T16:00:00.000Z",
        organizer: "MLD",
        buildingId: "ghc",
        sourceUrl: "https://example.edu/event",
      }),
    });
    const second = base({
      id: "b",
      source_id: "two",
      description: "Longer description with registration.",
      food_status: "EXPLICIT",
      food_confidence: 0.98,
      food_evidence: "Lunch will be provided.",
      registration_url: "https://example.edu/rsvp",
      fingerprint: first.fingerprint,
    });
    const merged = deduplicateEvents([first, second]);
    expect(merged).toHaveLength(1);
    expect(merged[0].food_status).toBe("EXPLICIT");
    expect(merged[0].registration_url).toBe("https://example.edu/rsvp");
  });

  it("keeps similar but distinct events", () => {
    const a = base({
      id: "a",
      title: "AI Seminar",
      fingerprint: "a",
    });
    const b = base({
      id: "b",
      title: "Systems Seminar",
      start_time: "2026-09-12T17:00:00.000Z",
      fingerprint: "b",
    });
    expect(deduplicateEvents([a, b])).toHaveLength(2);
  });
});
