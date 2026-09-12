"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Event } from "@/lib/types";
import { calendarDateInZone } from "@/lib/timezone";
import { DEMO_CLOCK_EVENT, demoToday } from "@/lib/demo-clock";
import { eventVisible, type MapFilters } from "@/lib/filters";
import { FilterBar } from "@/components/map/FilterBar";
import { EventBottomSheet } from "@/components/map/EventBottomSheet";
import { ClusterSheet } from "@/components/map/ClusterSheet";
import { BottomNav } from "@/components/ui/BottomNav";
import { MapPanelOverlay } from "@/components/ui/MapPanelOverlay";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { PressStartGate, StatusBar } from "@/components/ui/PressStart";
import { NowGoingTicker } from "@/components/live/NowGoingTicker";
import {
  APP_RESET_EVENT,
  loadLastPlanEventIds,
  loadPreferences,
  seedDemoAvailability,
  upsertTodo,
} from "@/lib/storage/local-state";
import { buildMealRoute } from "@/lib/maps/meal-route";
import { prefetchCampusEvents } from "@/lib/events-client";
import { APP_CONFIG } from "@/lib/config";
import { applyCorpusBoost } from "@/lib/community/boost";
import { liveNowGoing, loadScotty, onScottyChange } from "@/lib/scotty/state";

const CampusMap = dynamic(
  () => import("@/components/map/CampusMap").then((mod) => mod.CampusMap),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-canvas" /> },
);

const PlannerExperience = dynamic(
  () =>
    import("@/components/planner/PlannerExperience").then(
      (mod) => mod.PlannerExperience,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card/95 px-4 py-3">
          <LoadingState label="Opening planner…" />
        </div>
      </div>
    ),
  },
);

const ScottyExperience = dynamic(
  () =>
    import("@/components/pet/ScottyExperience").then((mod) => mod.ScottyExperience),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card/95 px-4 py-3">
          <LoadingState label="Waking Scotty…" />
        </div>
      </div>
    ),
  },
);

const TodosExperience = dynamic(
  () =>
    import("@/components/todos/TodosExperience").then((mod) => mod.TodosExperience),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card/95 px-4 py-3">
          <LoadingState label="Loading to-dos…" />
        </div>
      </div>
    ),
  },
);

type AppPanel = "plan" | "scotty" | "quest" | null;

function parsePanel(value: string | null): AppPanel {
  if (value === "plan" || value === "scotty" || value === "quest") return value;
  return null;
}

export function MapExperience() {
  const params = useSearchParams();
  const [panel, setPanel] = useState<AppPanel>(() => parsePanel(params.get("panel")));
  const [planDate, setPlanDate] = useState(() => params.get("date"));
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pings, setPings] = useState<{ eventId: string; title: string; buildingId: string | null; at: string }[]>([]);
  const [plannedIds, setPlannedIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadLastPlanEventIds(),
  );
  const [clusterEvents, setClusterEvents] = useState<Event[] | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    date: demoToday(),
    meals: ["breakfast", "lunch", "dinner", "snacks"],
    explicitOnly: false,
    includeLikely: true,
  });

  function syncPanelUrl(next: AppPanel, extra?: Record<string, string>) {
    const query = new URLSearchParams(window.location.search);
    if (next) query.set("panel", next);
    else query.delete("panel");
    if (next === "plan") {
      if (extra) {
        for (const [key, value] of Object.entries(extra)) query.set(key, value);
      }
    } else {
      query.delete("event");
      query.delete("date");
    }
    const qs = query.toString();
    window.history.replaceState({ panel: next }, "", qs ? `/?${qs}` : "/");
  }

  function closePanel() {
    if (!panel) return;
    setPanel(null);
    setPlanDate(null);
    const ids = loadLastPlanEventIds();
    setPlannedIds(ids);
    setShowRoute(ids.length >= 2);
    syncPanelUrl(null);
  }

  function openPanel(next: AppPanel, extra?: Record<string, string>) {
    if (!next) {
      closePanel();
      return;
    }
    setPanel(next);
    setPlanDate(next === "plan" ? (extra?.date ?? null) : null);
    setSelectedId(null);
    syncPanelUrl(next, extra);
  }

  function closePlan() {
    closePanel();
  }

  function openPlan(extra?: Record<string, string>) {
    openPanel("plan", extra);
  }

  useEffect(() => {
    if (panel !== "plan") {
      const ids = loadLastPlanEventIds();
      setPlannedIds(ids);
      setShowRoute(ids.length >= 2);
    }
    if (panel) {
      setSelectedId(null);
      setClusterEvents(null);
    }
  }, [panel]);

  useEffect(() => {
    const onReset = () => {
      setPlannedIds([]);
      setShowRoute(false);
      setSelectedId(null);
      setClusterEvents(null);
      setFilters((prev) => ({ ...prev, date: demoToday() }));
    };
    const onClock = () => {
      setFilters((prev) => {
        const date = demoToday();
        return prev.date === date ? prev : { ...prev, date };
      });
    };
    window.addEventListener(APP_RESET_EVENT, onReset);
    window.addEventListener(DEMO_CLOCK_EVENT, onClock);
    return () => {
      window.removeEventListener(APP_RESET_EVENT, onReset);
      window.removeEventListener(DEMO_CLOCK_EVENT, onClock);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const query = new URLSearchParams(window.location.search);
      const next = parsePanel(query.get("panel"));
      setPanel(next);
      setPlanDate(query.get("date"));
      if (next) setSelectedId(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
    prefetchCampusEvents()
      .then((loaded) => {
        if (!cancelled) {
          setEvents(loaded);
          setStatus("ready");
          const query = new URLSearchParams(window.location.search);
          const deep = query.get("event");
          if (deep && !query.get("panel")) setSelectedId(deep);
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
      if (plannedIds.includes(event.id)) return true;
      const date = calendarDateInZone(new Date(event.start_time));
      if (date !== filters.date) return false;
      return eventVisible(event, filters);
    });
    return applyCorpusBoost(filtered, pings);
  }, [events, filters, pings, plannedIds]);

  const selected = visible.find((event) => event.id === selectedId) ?? events.find((event) => event.id === selectedId) ?? null;
  const todayCount = visible.filter(
    (event) => calendarDateInZone(new Date(event.start_time)) === filters.date,
  ).length;
  const plannedCount = visible.filter((event) => plannedIds.includes(event.id)).length;
  const routeStops = useMemo(() => {
    const prefs = loadPreferences();
    return buildMealRoute({
      events: visible,
      plannedIds,
      date: filters.date,
      startBuildingId: prefs.home_building_id,
    });
  }, [visible, plannedIds, filters.date]);
  const canShowRoute = routeStops.length >= 2;

  function openEvents(group: Event[]) {
    if (group.length === 1 && group[0]) {
      setClusterEvents(null);
      setSelectedId(group[0].id);
      return;
    }
    setSelectedId(null);
    setClusterEvents(group);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-canvas">
      <PressStartGate />
      <div className={`absolute inset-0 ${panel ? "pointer-events-none" : ""}`}>
        <CampusMap
          events={visible}
          selectedId={selectedId}
          plannedIds={plannedIds}
          showRoute={showRoute && canShowRoute}
          routeStops={routeStops}
          onOpen={openEvents}
          onScottyClick={() => openPanel("scotty")}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(10px,env(safe-area-inset-top))]">
          <div className="pointer-events-auto mx-auto max-w-lg pixel-panel bg-card/95 p-2">
            <StatusBar right={APP_CONFIG.demoMode ? "DEMO" : "LIVE"} />
            <div className="mt-1 flex items-center justify-between gap-2">
              <div>
                <h1 className="hud text-[13px] leading-6">SCOTTYBITES</h1>
                <p className="text-xs font-bold text-muted">Personalized free-meal planner</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="pixel-chip px-2 py-1 text-[11px]"
                  data-on={showRoute && canShowRoute ? "true" : "false"}
                  disabled={!canShowRoute}
                  onClick={() => setShowRoute((open) => !open)}
                  aria-pressed={showRoute && canShowRoute}
                  title={
                    canShowRoute
                      ? "Show today's meal path"
                      : "Plan at least two stops to show a path"
                  }
                >
                  ROUTE
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
            {pings.length > 0 && (
              <div className="mt-2 border-4 border-ink bg-[#fffaf0] px-2 py-1">
                <NowGoingTicker />
              </div>
            )}
            {filtersOpen && (
              <div className="mt-2">
                <FilterBar filters={filters} onChange={setFilters} />
              </div>
            )}
          </div>
        </div>

        {!selected && !clusterEvents && (
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
                  {todayCount} FOOD DROP{todayCount === 1 ? "" : "S"} TODAY
                  {plannedCount > 0 ? ` · ${plannedCount} ON YOUR PLAN` : ""}
                  {showRoute && canShowRoute ? " · PATH ON" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <ClusterSheet
          events={clusterEvents ?? []}
          plannedIds={plannedIds}
          onSelect={(event) => {
            setClusterEvents(null);
            setSelectedId(event.id);
          }}
          onClose={() => setClusterEvents(null)}
        />

        <EventBottomSheet
          event={selected}
          onClose={() => setSelectedId(null)}
          onAddToPlan={(event) => {
            openPlan({
              event: event.id,
              date: filters.date,
            });
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
            openPanel("quest");
          }}
        />
      </div>

      <MapPanelOverlay open={panel === "plan"} closeLabel="Close planner" onClose={closePanel}>
        <PlannerExperience variant="overlay" onClose={closePanel} dateOverride={planDate} />
      </MapPanelOverlay>
      <MapPanelOverlay open={panel === "scotty"} closeLabel="Close Scotty" onClose={closePanel}>
        <ScottyExperience variant="overlay" onClose={closePanel} />
      </MapPanelOverlay>
      <MapPanelOverlay open={panel === "quest"} closeLabel="Close quests" onClose={closePanel}>
        <TodosExperience variant="overlay" onClose={closePanel} />
      </MapPanelOverlay>

      <BottomNav
        current={
          panel === "plan"
            ? "/plan"
            : panel === "scotty"
              ? "/scotty"
              : panel === "quest"
                ? "/todos"
                : "/"
        }
        onSelectMap={closePanel}
        onSelectPlan={() => openPanel("plan")}
        onSelectScotty={() => openPanel("scotty")}
        onSelectQuest={() => openPanel("quest")}
      />
    </div>
  );
}
