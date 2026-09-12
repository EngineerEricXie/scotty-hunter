import type { EventRepository } from "@/lib/db/event-repository";
import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";
import { trySupabaseRepository } from "@/lib/db/supabase-event-repository";
import { APP_CONFIG } from "@/lib/config";

let singleton: EventRepository | null = null;

export function getEventRepository(): EventRepository {
  if (singleton) return singleton;
  if (!APP_CONFIG.demoMode) {
    const supabase = trySupabaseRepository();
    if (supabase) {
      singleton = supabase;
      return singleton;
    }
  }
  singleton = new LocalFixtureEventRepository();
  return singleton;
}

export function repositoryMode(): "local-fixture" | "supabase" {
  if (!APP_CONFIG.demoMode && trySupabaseRepository()) return "supabase";
  return "local-fixture";
}
