"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Itinerary, MealType, UserPreference } from "@/lib/types";
import { demoToday } from "@/lib/demo-clock";
import { loadPreferences, savePreferences } from "@/lib/storage/local-state";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { MealItinerary } from "@/components/planner/MealItinerary";
import { RouteSummary } from "@/components/planner/RouteSummary";
import { BottomNav } from "@/components/ui/BottomNav";
import { UnavailableIntegration } from "@/components/ui/States";
import { StatusBar } from "@/components/ui/PressStart";

export function PlannerExperience() {
  const params = useSearchParams();
  const [prefs, setPrefs] = useState<UserPreference>(loadPreferences);
  const [date, setDate] = useState(() => params.get("date") ?? demoToday());
  const [plan, setPlan] = useState<Itinerary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const requestedMeals = useMemo(() => {
    const meals: MealType[] = [];
    if (prefs.wants_breakfast) meals.push("breakfast");
    if (prefs.wants_lunch) meals.push("lunch");
    if (prefs.wants_dinner) meals.push("dinner");
    if (prefs.wants_snacks) meals.push("snacks");
    return meals.length ? meals : (["lunch", "dinner"] as MealType[]);
  }, [prefs]);

  async function submit() {
    setBusy(true);
    setError("");
    savePreferences(prefs);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          meals: requestedMeals,
          max_walking_minutes: prefs.max_walking_minutes,
          start_building_id: prefs.home_building_id,
          include_likely: prefs.include_likely,
          explicit_only: prefs.explicit_only,
          allow_expired_registration: false,
        }),
      });
      const json = (await res.json()) as { itinerary?: Itinerary; error?: string };
      if (!res.ok || !json.itinerary) {
        throw new Error(json.error ?? "Planner failed");
      }
      setPlan(json.itinerary);
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
      body: JSON.stringify({
        date,
        meals: requestedMeals,
        max_walking_minutes: prefs.max_walking_minutes,
        start_building_id: prefs.home_building_id,
        include_likely: prefs.include_likely,
        explicit_only: prefs.explicit_only,
      }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scottybites-${date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card p-4">
          <StatusBar right="PLAN" />
          <h1 className="hud mt-3 text-[13px] leading-6">FREE FOOD ROUTE</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-muted">
            Deterministic scoring — not an LLM. Walking uses building coordinates at 80 m/min.
          </p>
          <div className="mt-4">
            <PlannerForm
              value={prefs}
              date={date}
              onChangeDate={setDate}
              onChange={setPrefs}
              onSubmit={submit}
              busy={busy}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-bold text-gold">{error}</p>}

        {plan && (
          <div className="mt-4 space-y-3">
            <RouteSummary plan={plan} />
            <MealItinerary plan={plan} />
            <button
              type="button"
              onClick={downloadIcs}
              className="pixel-btn min-h-11 w-full bg-card text-sm"
            >
              ADD DAY TO CALENDAR (.ICS)
            </button>
            <UnavailableIntegration
              name="Google Calendar"
              detail="OAuth is scaffolded. Without client credentials, export an ICS file instead."
            />
          </div>
        )}
      </main>
      <BottomNav current="/plan" />
    </div>
  );
}
