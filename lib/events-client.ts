import type { Event } from "@/lib/types";

let inflight: Promise<Event[]> | null = null;

export function prefetchCampusEvents(): Promise<Event[]> {
  if (!inflight) {
    inflight = fetch("/api/events")
      .then(async (res) => {
        const json = (await res.json()) as { events?: Event[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load events");
        return json.events ?? [];
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }
  return inflight;
}
