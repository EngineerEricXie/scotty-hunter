import { hasSupabaseCredentials, SERVER_CONFIG } from "@/lib/config";
import type { EventRepository } from "@/lib/db/event-repository";
import type { Building, Event, EventFilter, Source } from "@/lib/types";

/**
 * Scaffolded Supabase adapter. Activation requires a real project URL + keys.
 * The app never calls this repository unless credentials are present.
 */
export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly url: string, private readonly key: string) {}

  private async rest<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Supabase ${res.status} on ${path}`);
    }
    return (await res.json()) as T;
  }

  async listEvents(filter: EventFilter = {}): Promise<Event[]> {
    const params = new URLSearchParams({ select: "*" });
    if (filter.building) params.set("building_id", `eq.${filter.building}`);
    if (filter.food_status?.length) {
      params.set("food_status", `in.(${filter.food_status.join(",")})`);
    }
    return this.rest<Event[]>(`events?${params.toString()}`);
  }

  async getEvent(id: string): Promise<Event | null> {
    const rows = await this.rest<Event[]>(`events?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async upsertEvents(events: Event[]): Promise<void> {
    await this.rest("events?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(events),
    });
  }

  async listBuildings(): Promise<Building[]> {
    return this.rest<Building[]>("buildings?select=*");
  }

  async getBuilding(id: string): Promise<Building | null> {
    const rows = await this.rest<Building[]>(`buildings?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async listSources(): Promise<Source[]> {
    return this.rest<Source[]>("sources?select=*");
  }

  async updateSource(id: string, patch: Partial<Source>): Promise<void> {
    await this.rest(`sources?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }
}

export function trySupabaseRepository(): EventRepository | null {
  if (!hasSupabaseCredentials()) return null;
  return new SupabaseEventRepository(
    SERVER_CONFIG.supabaseUrl,
    SERVER_CONFIG.supabaseServiceRoleKey || SERVER_CONFIG.supabaseAnonKey,
  );
}
