import type { Event, Itinerary } from "@/lib/types";
import { getBuilding } from "@/lib/maps/buildings";
import { foodStatusLabel } from "@/lib/extraction/classify-food";

export interface CalendarService {
  readonly name: string;
  readonly connected: boolean;
  addEvent(event: Event): Promise<{ ok: boolean; message: string }>;
  addItinerary(plan: Itinerary): Promise<{ ok: boolean; message: string }>;
}

export class MockCalendarService implements CalendarService {
  readonly name = "mock";
  readonly connected = false;

  async addEvent() {
    return {
      ok: false,
      message:
        "Google Calendar is not connected. Download an .ics file instead, or add Google OAuth credentials later.",
    };
  }

  async addItinerary() {
    return {
      ok: false,
      message:
        "Google Calendar is not connected. Use Add Day to Calendar to download an .ics file.",
    };
  }
}

/**
 * Google Calendar adapter scaffold.
 * Real OAuth authorization is a manual deferred step.
 */
export class GoogleCalendarService implements CalendarService {
  readonly name = "google";
  readonly connected: boolean;

  constructor(connected: boolean) {
    this.connected = connected;
  }

  async addEvent() {
    return {
      ok: false,
      message:
        "Google OAuth is scaffolded but not authorized in this environment.",
    };
  }

  async addItinerary() {
    return {
      ok: false,
      message:
        "Google OAuth is scaffolded but not authorized in this environment.",
    };
  }
}

export function getCalendarService(): CalendarService {
  return new MockCalendarService();
}

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export function eventToIcs(event: Event): string {
  const building = getBuilding(event.building_id);
  const location = [building?.name, event.room].filter(Boolean).join(" ");
  const end = event.end_time ?? event.start_time;
  const description = [
    `${foodStatusLabel(event.food_status)} (${Math.round(event.food_confidence * 100)}%)`,
    event.food_evidence ? `Evidence: ${event.food_evidence}` : null,
    event.source_url ? `Source: ${event.source_url}` : null,
    event.registration_url ? `Registration: ${event.registration_url}` : null,
    event.provenance_note,
  ]
    .filter(Boolean)
    .join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ScottyBites//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@scottybites.local`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.start_time)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`🍕 ${event.title}`)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function itineraryToIcs(plan: Itinerary): string {
  const events = plan.events;
  const vevents = events.map((event) => {
    const building = getBuilding(event.building_id);
    const location = [building?.name, event.room].filter(Boolean).join(" ");
    const end = event.end_time ?? event.start_time;
    return [
      "BEGIN:VEVENT",
      `UID:${event.id}@scottybites.local`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(event.start_time)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(`🍕 ${event.title}`)}`,
      `LOCATION:${icsEscape(location)}`,
      `DESCRIPTION:${icsEscape(event.food_evidence ?? event.description)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ScottyBites//EN",
    "CALSCALE:GREGORIAN",
    ...vevents,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
