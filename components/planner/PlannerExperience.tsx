"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Event, Itinerary, UserPreference, WeekPlan } from "@/lib/types";
import { demoToday } from "@/lib/demo-clock";
import {
  loadPreferences,
  saveLastPlanEventIds,
  savePreferences,
  upsertTodo,
} from "@/lib/storage/local-state";
import { plannerRequestFromPrefs } from "@/lib/personalization/request";
import { applyDemoPersona } from "@/lib/personalization/demo-persona";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { PreferenceAgent } from "@/components/planner/PreferenceAgent";
import { MealItinerary, RequiredActionsList } from "@/components/planner/MealItinerary";
import { RouteSummary } from "@/components/planner/RouteSummary";
import { BottomNav } from "@/components/ui/BottomNav";
import { UnavailableIntegration } from "@/components/ui/States";
import { StatusBar } from "@/components/ui/PressStart";
import { formatLongDate } from "@/lib/timezone";

export function PlannerExperience({
  variant = "page",
  onClose,
  dateOverride,
}: {
  variant?: "page" | "overlay";
  onClose?: () => void;
  dateOverride?: string | null;
}) {
  const params = useSearchParams();
  const [prefs, setPrefs] = useState<UserPreference>(loadPreferences);
  const [date, setDate] = useState(() => dateOverride ?? params.get("date") ?? demoToday());
  const [mode, setMode] = useState<"day" | "week">("day");
  const [plan, setPlan] = useState<Itinerary | null>(null);
  const [week, setWeek] = useState<WeekPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Record<string, Event>>({});

  const requestBody = useMemo(
    () => plannerRequestFromPrefs(prefs, date, mode),
    [prefs, date, mode],
  );

  function persist(next: UserPreference, rerun = false) {
    setPrefs(next);
    savePreferences(next);
    if (rerun) void submit({ prefs: next });
  }

  function addTodo(eventId: string) {
    const event = events[eventId] ?? week?.days.flatMap((day) => day.itinerary.events).find((item) => item.id === eventId) ?? plan?.events.find((item) => item.id === eventId);
    if (!event) return;
    upsertTodo({
      id: `todo-${event.id}`,
      user_id: "local",
      event_id: event.id,
      type: "RSVP",
      title: `Register: ${event.title}`,
      deadline: event.registration_deadline,
      status: "OPEN",
      registration_url: event.registration_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function submit(override?: { prefs?: UserPreference; mode?: "day" | "week"; date?: string }) {
    const nextPrefs = override?.prefs ?? prefs;
    const nextMode = override?.mode ?? mode;
    const nextDate = override?.date ?? date;
    const body = plannerRequestFromPrefs(nextPrefs, nextDate, nextMode);
    setBusy(true);
    setError("");
    savePreferences(nextPrefs);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        itinerary?: Itinerary;
        week?: WeekPlan;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Planner failed");
      if (nextMode === "week" && json.week) {
        setWeek(json.week);
        setPlan(null);
        const ids = json.week.days.flatMap((day) => day.itinerary.events.map((event) => event.id));
        saveLastPlanEventIds(ids);
        const map: Record<string, Event> = {};
        for (const event of json.week.days.flatMap((day) => day.itinerary.events)) {
          map[event.id] = event;
        }
        setEvents(map);
      } else if (json.itinerary) {
        setPlan(json.itinerary);
        setWeek(null);
        saveLastPlanEventIds(json.itinerary.events.map((event) => event.id));
        const map: Record<string, Event> = {};
        for (const event of json.itinerary.events) map[event.id] = event;
        setEvents(map);
      } else {
        throw new Error("Planner failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planner failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadIcs() {
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, mode: "day" }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scottybites-${date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function runDemoPlan() {
    const next = applyDemoPersona(prefs);
    setPrefs(next);
    savePreferences(next);
    setMode("day");
    void submit({ prefs: next, mode: "day" });
  }

  useEffect(() => {
    if (!plan && !week) return;
    document.querySelector("[data-map-panel-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [plan, week]);

  const overlay = variant === "overlay";

  return (
    <div className={overlay ? "pb-2" : "min-h-dvh bg-canvas pb-28"}>
      <main className="mx-auto max-w-lg space-y-3 px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card/95 p-4">
          <StatusBar right="PLAN" />
          <div className="mt-3 flex items-start justify-between gap-3">
            <h1 className="hud text-[13px] leading-6">PERSONALIZED MEAL PLAN</h1>
            {onClose && (
              <button
                type="button"
                className="pixel-chip min-h-10 shrink-0 px-3 text-sm"
                onClick={onClose}
                aria-label="Close planner"
              >
                CLOSE
              </button>
            )}
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-muted">
            Ranking stays deterministic — not an LLM. Demo: load the persona, plan today, then see it
            on the map.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={runDemoPlan}
            className="pixel-btn mt-3 min-h-12 w-full bg-gold text-sm disabled:opacity-60"
          >
            {busy && mode === "day" ? "Planning demo day…" : "RUN DEMO PLAN"}
          </button>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              data-on={mode === "day" ? "true" : "false"}
              className="pixel-chip min-h-10 flex-1 bg-white text-sm"
              onClick={() => {
                setMode("day");
                if (plan || week) void submit({ mode: "day" });
              }}
            >
              Plan today
            </button>
            <button
              type="button"
              data-on={mode === "week" ? "true" : "false"}
              className="pixel-chip min-h-10 flex-1 bg-white text-sm"
              onClick={() => {
                setMode("week");
                if (plan || week) void submit({ mode: "week" });
              }}
            >
              Plan my week
            </button>
          </div>
        </div>

        {error && <p className="text-sm font-bold text-gold">{error}</p>}

        {plan && (
          <div className="space-y-3">
            <RouteSummary plan={plan} />
            <RequiredActionsList actions={plan.required_actions} onAddTodo={addTodo} />
            <MealItinerary plan={plan} onAddTodo={addTodo} />
            <button
              type="button"
              onClick={() => onClose?.()}
              className="pixel-btn min-h-11 w-full bg-ink text-sm text-gold"
            >
              SEE ITINERARY ON MAP
            </button>
            <button type="button" onClick={downloadIcs} className="pixel-btn min-h-11 w-full bg-card text-sm">
              ADD DAY TO CALENDAR (.ICS)
            </button>
            <UnavailableIntegration
              name="Google Calendar"
              detail="OAuth is scaffolded. Without client credentials, export an ICS file instead."
            />
          </div>
        )}

        {week && (
          <div className="space-y-3">
            <RequiredActionsList actions={week.required_actions} onAddTodo={addTodo} />
            {week.notes.length > 0 && (
              <p className="text-sm font-bold text-muted">{week.notes.join(" · ")}</p>
            )}
            {week.days.map((day) => (
              <section key={day.date} className="space-y-2">
                <h2 className="hud text-[10px]">
                  {day.weekday.toUpperCase()} · {formatLongDate(day.date)}
                </h2>
                <RouteSummary plan={day.itinerary} />
                <MealItinerary plan={day.itinerary} onAddTodo={addTodo} />
              </section>
            ))}
            <button
              type="button"
              onClick={() => onClose?.()}
              className="pixel-btn min-h-11 w-full bg-ink text-sm text-gold"
            >
              SEE ITINERARY ON MAP
            </button>
          </div>
        )}

        <PreferenceAgent
          value={prefs}
          busyPlan={busy}
          onApplied={(next) => persist(next, Boolean(plan || week))}
        />

        <div className="pixel-panel bg-card/95 p-4">
          <PlannerForm
            value={prefs}
            date={date}
            onChangeDate={(nextDate) => {
              setDate(nextDate);
              if (plan || week) void submit({ date: nextDate });
            }}
            onChange={persist}
            onSubmit={() => void submit()}
            busy={busy}
            submitLabel={mode === "week" ? "Plan my week" : "Plan my free food day"}
          />
        </div>
      </main>
      {!overlay && <BottomNav current="/plan" />}
    </div>
  );
}
