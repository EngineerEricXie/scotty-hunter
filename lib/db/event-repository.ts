import type { Building, Event, EventFilter, Source } from "@/lib/types";

export type { EventFilter };

export interface EventRepository {
  listEvents(filter?: EventFilter): Promise<Event[]>;
  getEvent(id: string): Promise<Event | null>;
  upsertEvents(events: Event[]): Promise<void>;
  listBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | null>;
  listSources(): Promise<Source[]>;
  updateSource(id: string, patch: Partial<Source>): Promise<void>;
}
