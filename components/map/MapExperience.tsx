"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import { calendarDateInZone } from "@/lib/timezone";
import { demoToday } from "@/lib/demo-clock";
import { eventVisible, type MapFilters } from "@/lib/filters";
import { FilterBar } from "@/components/map/FilterBar";
import { EventBottomSheet } from "@/components/map/EventBottomSheet";
import { BottomNav } from "@/components/ui/BottomNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { PressStartGate, StatusBar } from "@/components/ui/PressStart";
import { NowGoingTicker } from "@/components/live/NowGoingTicker";
import { seedDemoAvailability, upsertTodo } from "@/lib/storage/local-state";
import { APP_CONFIG } from "@/lib/config";
import { applyCorpusBoost } from "@/lib/community/boost";
import { liveNowGoing, loadScotty, onScottyChange } from "@/lib/scotty/state";
import { PixelCampusMap } from "@/components/map/PixelCampusMap";

const CampusMap = dynamic(
  () => import("@/components/map/CampusMap").then((mod) => mod.CampusMap),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-sky" /> },
);

export function MapExperience() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapMode, setMapMode] = useState<"pixel" | "geo">("pixel");
  const [pings, setPings] = useState<{ eventId: string; title: string; buildingId: string | null; at: string }[]>([]);
  const [filters, setFilters] = useState<MapFilters>({
    date: demoToday(),
    meals: ["breakfast", "lunch", "dinner", "snacks"],
    explicitOnly: false,
    includeLikely: true,
  });

  useEffect(() => {
    seedDemoAvailability();
    const refreshPings = () => {
      setPings(
        liveNowGoing().map((ping) => ({
          eventId: ping.eventId,
          title: ping.title,
          buildingId: ping.buildingId,
          at: ping.at,
        })),
      );
    };
    const unsub = onScottyChange(refreshPings);
    const boot = window.setTimeout(() => {
      loadScotty();
      refreshPings();
    }, 0);
    let cancelled = false;
    fetch("/api/events")
      .then(async (res) => {
        const json = (await res.json()) as { events?: Event[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load events");
        if (!cancelled) {
          setEvents(json.events ?? []);
          setStatus("ready");
          const deep = new URLSearchParams(window.location.search).get("event");
          if (deep) setSelectedId(deep);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load events");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(boot);
    };
  }, []);

  const visible = useMemo(() => {
    const filtered = events.filter((event) => {
      const date = calendarDateInZone(new Date(event.start_time));
      if (date !== filters.date) return false;
      return eventVisible(event, filters);
    });
    return applyCorpusBoost(filtered, pings);
  }, [events, filters, pings]);

  const selected = visible.find((event) => event.id === selectedId) ?? events.find((event) => event.id === selectedId) ?? null;
  const MapView = mapMode === "pixel" ? PixelCampusMap : CampusMap;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-canvas">
      <PressStartGate />
      <MapView events={visible} selectedId={selectedId} onSelect={(event) => setSelectedId(event.id)} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="pointer-events-auto mx-auto max-w-lg pixel-panel bg-card/95 p-3">
          <StatusBar right={APP_CONFIG.demoMode ? "DEMO" : "LIVE"} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              <h1 className="hud text-[13px] leading-6">SCOTTYBITES</h1>
              <p className="text-xs font-bold text-muted">CMU free-food hunter</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="pixel-chip px-2 py-1 text-[11px]"
                data-on={mapMode === "pixel" ? "true" : "false"}
                onClick={() => setMapMode(mapMode === "pixel" ? "geo" : "pixel")}
              >
                {mapMode === "pixel" ? "PIXEL" : "GEO"}
              </button>
              <button
                type="button"
                className="pixel-chip px-2 py-1 text-[11px]"
                data-on={filtersOpen ? "true" : "false"}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                FILTER
              </button>
            </div>
          </div>
          <div className="mt-2 border-4 border-ink bg-[#fffaf0] px-2 py-1">
            <NowGoingTicker />
          </div>
          {filtersOpen && (
            <div className="mt-2">
              <FilterBar filters={filters} onChange={setFilters} />
            </div>
          )}
        </div>
      </div>

      {!selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[108px]">
          <div className="pointer-events-auto mx-auto max-w-lg space-y-2">
            {status === "loading" && (
              <div className="pixel-panel px-4 py-2">
                <LoadingState label="Loading campus food…" />
              </div>
            )}
            {status === "error" && <ErrorState message={error} />}
            {status === "ready" && visible.length === 0 && (
              <EmptyState
                title="No free food matches"
                body="Try another day, include likely events, or clear a meal filter."
              />
            )}
            {status === "ready" && visible.length > 0 && (
              <p className="pixel-panel px-3 py-2 text-sm font-bold">
                {visible.length} FOOD DROP{visible.length === 1 ? "" : "S"} TODAY
              </p>
            )}
          </div>
        </div>
      )}

      <EventBottomSheet
        event={selected}
        onClose={() => setSelectedId(null)}
        onAddToPlan={(event) => {
          const meals = new URLSearchParams({
            event: event.id,
            date: filters.date,
          });
          router.push(`/plan?${meals.toString()}`);
        }}
        onAddTodo={(event) => {
          upsertTodo({
            id: `todo-${event.id}`,
            user_id: "local",
            event_id: event.id,
            type: event.registration_required ? "RSVP" : "REMINDER",
            title: `Register: ${event.title}`,
            deadline: event.registration_deadline,
            status: "OPEN",
            registration_url: event.registration_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          router.push("/todos");
        }}
      />

      <BottomNav current="/" />
    </div>
  );
}
