"use client";

import { assetPath } from "@/lib/runtime";
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
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  MapPin,
  List,
  Map as MapIcon,
  Route,
  X,
} from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { ScottySprite } from "@/components/pet/ScottySprite";
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
import { VIEWPORT_SYNC_EVENT, syncAppViewportVars } from "@/lib/ui/viewport-sync";

const CampusMap = dynamic(
  () => import("@/components/map/DiscoveryMap").then((mod) => mod.DiscoveryMap),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-canvas" /> },
);

const PlannerExperience = dynamic(
  () =>
    import("@/components/planner/PlannerExperience").then((mod) => mod.PlannerExperience),
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
  () => import("@/components/pet/ScottyExperience").then((mod) => mod.ScottyExperience),
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
  () => import("@/components/todos/TodosExperience").then((mod) => mod.TodosExperience),
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
  const [listOpen, setListOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pings, setPings] = useState<
    { eventId: string; title: string; buildingId: string | null; at: string }[]
  >([]);
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
    window.history.replaceState({ panel: next }, "", assetPath(qs ? `/?${qs}` : "/"));
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
    setClusterEvents(null);
    syncPanelUrl(next, extra);
  }

  function closePlan() {
    closePanel();
  }

  function openPlan(extra?: Record<string, string>) {
    openPanel("plan", extra);
  }

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    syncAppViewportVars();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncAppViewportVars);
    viewport?.addEventListener("scroll", syncAppViewportVars);
    window.addEventListener("resize", syncAppViewportVars);
    window.addEventListener("pageshow", syncAppViewportVars);
    window.addEventListener("orientationchange", syncAppViewportVars);
    window.addEventListener(VIEWPORT_SYNC_EVENT, syncAppViewportVars);
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncAppViewportVars();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      viewport?.removeEventListener("resize", syncAppViewportVars);
      viewport?.removeEventListener("scroll", syncAppViewportVars);
      window.removeEventListener("resize", syncAppViewportVars);
      window.removeEventListener("pageshow", syncAppViewportVars);
      window.removeEventListener("orientationchange", syncAppViewportVars);
      window.removeEventListener(VIEWPORT_SYNC_EVENT, syncAppViewportVars);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
      setSelectedId(null);
      setClusterEvents(null);
      if (!next) {
        const ids = loadLastPlanEventIds();
        setPlannedIds(ids);
        setShowRoute(ids.length >= 2);
      }
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
      if (
        search &&
        !`${event.title} ${event.venue_raw} ${event.food_items.join(" ")} ${event.food_types.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      const date = calendarDateInZone(new Date(event.start_time));
      if (date !== filters.date) return false;
      return eventVisible(event, filters);
    });
    return applyCorpusBoost(filtered, pings);
  }, [events, filters, pings, search]);

  const selected =
    visible.find((event) => event.id === selectedId) ??
    events.find((event) => event.id === selectedId) ??
    null;
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
  const goingEventIds = useMemo(() => pings.map((ping) => ping.eventId), [pings]);

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
    <div
      className="app-shell fixed inset-x-0 w-full overflow-hidden bg-canvas"
      style={{ top: "var(--app-offset-top, 0px)", height: "var(--app-height, 100dvh)" }}
    >
      <div
        className={`absolute inset-0 ${panel ? "pointer-events-none" : ""}`}
        inert={!!panel}
      >
        <div className="campus-map-frame">
          <CampusMap
            events={visible}
            selectedId={selectedId}
            plannedIds={plannedIds}
            showRoute={showRoute && canShowRoute}
            routeStops={routeStops}
            goingEventIds={goingEventIds}
            onOpen={openEvents}
            onScottyClick={() => openPanel("scotty")}
          />
        </div>

        <aside
          className={`discovery-panel ${listOpen ? "is-list-open" : ""}`}
          aria-label="Find campus food"
        >
          <div className="discovery-heading">
            <div className="brand-row">
              <button
                className="brand"
                onClick={() => {
                  setSearch("");
                  setListOpen(false);
                }}
                aria-label="ScottyBites home"
              >
                <span className="brand-mascot">
                  <ScottySprite mood="happy" action="idle" />
                </span>
                <span>
                  scotty<span className="brand-accent">bites</span>
                  <small>YOUR CAMPUS. YOUR NEXT BITE.</small>
                </span>
              </button>
              <span className="demo-pill">{APP_CONFIG.demoMode ? "DEMO" : "CMU"}</span>
            </div>
            <div className="discovery-intro">
              <p className="eyebrow">A LITTLE EXPLORING. A LOT TO EAT.</p>
              <h1>
                Good food.
                <br />
                <span>Great company.</span>
              </h1>
              <p>
                Find free food around Carnegie Mellon.
                <br />
                Leave the planning to Scotty.
              </p>
            </div>
            <label className="food-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search food or events</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setListOpen(true);
                }}
                placeholder="Pizza, lunch, a little coffee…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <div className="discovery-actions">
              <button
                className="filter-toggle"
                aria-expanded={filtersOpen}
                aria-controls="food-filters"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal size={16} /> Filters {filtersOpen ? "−" : "+"}
              </button>
              <button
                className="mobile-view-toggle"
                onClick={() => setListOpen(!listOpen)}
                aria-pressed={listOpen}
              >
                {listOpen ? <MapIcon size={16} /> : <List size={16} />}
                {listOpen ? "Map view" : "List view"}
              </button>
              <span className="results-count" aria-live="polite">
                {status === "ready" ? `${todayCount} bites to explore` : "Finding bites…"}
              </span>
            </div>
            <div
              id="food-filters"
              className={filtersOpen ? "filters-expanded" : "filters-compact"}
            >
              <FilterBar filters={filters} onChange={setFilters} compact={!filtersOpen} />
            </div>
          </div>
          <div className="discovery-results">
            <div className="results-heading">
              <h2>On the menu</h2>
              <span>
                {new Date(`${filters.date}T12:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {status === "loading" && <LoadingState label="Finding your next bite…" />}
            {status === "error" && (
              <>
                <ErrorState message={error} />
                <button className="retry-button" onClick={() => window.location.reload()}>
                  Try again
                </button>
              </>
            )}
            {status === "ready" && visible.length === 0 && (
              <div className="empty-results">
                <span aria-hidden="true">🍽️</span>
                <h3>No bites just yet</h3>
                <p>
                  Try another date or a different search. Our sample week starts September
                  12.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilters({
                      date: demoToday(),
                      meals: ["breakfast", "lunch", "dinner", "snacks"],
                      explicitOnly: false,
                      includeLikely: true,
                    });
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
            <div className="event-list">
              {[...visible]
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    selected={event.id === selectedId}
                    onSelect={(event) => {
                      setSelectedId(event.id);
                      setClusterEvents(null);
                      setListOpen(false);
                    }}
                  />
                ))}
            </div>
            {APP_CONFIG.demoMode && (
              <p className="demo-disclaimer">
                Interactive demo · Sample events from Sep 12–18, 2026. These are not live
                food listings. Your plans stay in this browser.
              </p>
            )}
          </div>
          <div className="discovery-footer">
            <button className="plan-cta" onClick={() => openPlan()}>
              <span>
                <strong>A whole day, sorted.</strong>
                <small>Build your free-food itinerary</small>
              </span>
              <ArrowRight size={21} />
            </button>
          </div>
        </aside>
        <div className="map-location-label">
          <span className="location-icon">
            <MapPin size={18} />
          </span>
          <span>
            <strong>Carnegie Mellon</strong>
            <small>Pittsburgh, Pennsylvania</small>
          </span>
        </div>
        <button
          className="map-route-button"
          disabled={!canShowRoute}
          aria-pressed={showRoute && canShowRoute}
          onClick={() => setShowRoute(!showRoute)}
          title={
            canShowRoute ? "Toggle your meal route" : "Build a plan to see your route"
          }
        >
          <Route size={18} />
          {showRoute && canShowRoute ? "Hide route" : "Meal route"}
        </button>
        {!selected && !clusterEvents && (
          <div className="map-hint">
            <span className="map-hint-dot" />
            Pick a bite on the map
            {plannedCount > 0 ? ` · ${plannedCount} planned` : " · Adventures start here"}
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

      <MapPanelOverlay
        open={panel === "plan"}
        closeLabel="Close planner"
        onClose={closePanel}
      >
        <PlannerExperience
          variant="overlay"
          onClose={closePanel}
          dateOverride={planDate}
        />
      </MapPanelOverlay>
      <MapPanelOverlay
        open={panel === "scotty"}
        closeLabel="Close Scotty"
        onClose={closePanel}
      >
        <ScottyExperience variant="overlay" onClose={closePanel} />
      </MapPanelOverlay>
      <MapPanelOverlay
        open={panel === "quest"}
        closeLabel="Close quests"
        onClose={closePanel}
      >
        <TodosExperience variant="overlay" onClose={closePanel} />
      </MapPanelOverlay>

      <BottomNav
        contained
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
