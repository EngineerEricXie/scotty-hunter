import type { EventFilter, EventRepository } from "@/lib/db/event-repository";
import { BUILDINGS } from "@/lib/maps/buildings";
import { SOURCE_REGISTRY } from "@/lib/crawler/source-registry";
import { extractEventsFromText } from "@/lib/extraction/extract-events";
import { deduplicateEvents } from "@/lib/dedup/deduplicate-events";
import { DEMO_SEEDED_EVENTS } from "@/data/fixtures/demo-events";
import { HACKCMU_FIXTURE_TEXT } from "@/data/fixtures/hackcmu-2026/source";
import { calendarDateInZone } from "@/lib/timezone";
import { inferMeal } from "@/lib/planner/score-event";
import type { Building, Event, Source } from "@/lib/types";

let cache: {
  events: Event[];
  sources: Source[];
} | null = null;

async function loadBaseEvents(): Promise<Event[]> {
  const extracted = await extractEventsFromText(
    {
      sourceUrl: "fixture://hackcmu-2026/opening-ceremony.txt",
      title: "HackCMU 2026 Opening Ceremony",
      text: HACKCMU_FIXTURE_TEXT,
      sourceDateContext: "2026-09-11",
    },
    {
      sourceId: "hackcmu-2026-fixture",
      sourceType: "pdf",
      provenanceNote:
        "Deterministic fixture extraction from HackCMU 2026 schedule text. Not live-scraped.",
    },
  );

  const named: Event[] = extracted.map((event) => {
    const rename: Record<string, string> = {};
    if (/dinner \+ sponsor expo/i.test(event.title)) {
      rename.id = "hackcmu-2026-friday-dinner";
    } else if (/midnight cafe/i.test(event.title)) {
      rename.id = "hackcmu-2026-midnight-cafe";
    } else if (/saturday lunch/i.test(event.title)) {
      rename.id = "hackcmu-2026-saturday-lunch";
    } else if (/saturday dinner/i.test(event.title)) {
      rename.id = "hackcmu-2026-saturday-dinner";
    } else if (/ifm workshop/i.test(event.title)) {
      rename.id = "hackcmu-2026-ifm-workshop";
    } else if (/cursor workshop/i.test(event.title)) {
      rename.id = "hackcmu-2026-cursor-workshop";
    }
    return rename.id ? { ...event, id: rename.id, source_external_id: rename.id } : event;
  });

  return deduplicateEvents([...named, ...DEMO_SEEDED_EVENTS]);
}

async function ensureCache() {
  if (cache) return cache;
  cache = {
    events: await loadBaseEvents(),
    sources: SOURCE_REGISTRY.map((source) => ({ ...source })),
  };
  return cache;
}

function matchesFilter(event: Event, filter: EventFilter): boolean {
  if (!filter.include_none && event.food_status === "NONE") return false;
  if (filter.date) {
    const eventDate = calendarDateInZone(new Date(event.start_time));
    if (eventDate !== filter.date) return false;
  }
  if (filter.start && event.start_time < filter.start) return false;
  if (filter.end && event.start_time > filter.end) return false;
  if (filter.food_status && filter.food_status.length > 0) {
    if (!filter.food_status.includes(event.food_status)) return false;
  }
  if (filter.meal && filter.meal.length > 0) {
    if (!filter.meal.includes(inferMeal(event))) return false;
  }
  if (filter.building && event.building_id !== filter.building) return false;
  return true;
}

export class LocalFixtureEventRepository implements EventRepository {
  async listEvents(filter: EventFilter = {}): Promise<Event[]> {
    const { events } = await ensureCache();
    return events
      .filter((event) => matchesFilter(event, filter))
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
  }

  async getEvent(id: string): Promise<Event | null> {
    const { events } = await ensureCache();
    return events.find((event) => event.id === id) ?? null;
  }

  async upsertEvents(incoming: Event[]): Promise<void> {
    const state = await ensureCache();
    state.events = deduplicateEvents([...state.events, ...incoming]);
  }

  async listBuildings(): Promise<Building[]> {
    return BUILDINGS;
  }

  async getBuilding(id: string): Promise<Building | null> {
    return BUILDINGS.find((b) => b.id === id) ?? null;
  }

  async listSources(): Promise<Source[]> {
    const { sources } = await ensureCache();
    return sources;
  }

  async updateSource(id: string, patch: Partial<Source>): Promise<void> {
    const { sources } = await ensureCache();
    const index = sources.findIndex((source) => source.id === id);
    if (index >= 0) {
      sources[index] = { ...sources[index], ...patch, updated_at: new Date().toISOString() };
    }
  }
}

export function resetLocalRepositoryCache() {
  cache = null;
}
