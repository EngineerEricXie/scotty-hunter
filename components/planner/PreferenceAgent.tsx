"use client";

import { useEffect, useState } from "react";
import type { UserPreference } from "@/lib/types";
import { describePreferences, englishPreferenceSummary } from "@/lib/personalization/apply-patch";
import { applyDemoPersona, DEMO_PERSONA_UTTERANCE } from "@/lib/personalization/demo-persona";

export function PreferenceAgent({
  value,
  onApplied,
  busyPlan,
}: {
  value: UserPreference;
  onApplied: (next: UserPreference) => void;
  busyPlan?: boolean;
}) {
  const [draft, setDraft] = useState(() =>
    /[\u4e00-\u9fff]/.test(value.last_preference_utterance)
      ? ""
      : value.last_preference_utterance,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [source, setSource] = useState<"llm" | "heuristic" | "">("");
  const [agentReady, setAgentReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/preferences/parse")
      .then((res) => res.json())
      .then((json: { agent_ready?: boolean }) => setAgentReady(Boolean(json.agent_ready)))
      .catch(() => setAgentReady(false));
  }, []);

  useEffect(() => {
    const utterance = value.last_preference_utterance;
    if (utterance && !/[\u4e00-\u9fff]/.test(utterance)) setDraft(utterance);
  }, [value.last_preference_utterance]);

  function loadDemoPersona() {
    const next = applyDemoPersona(value);
    setDraft(DEMO_PERSONA_UTTERANCE);
    setError("");
    setWarning("");
    setSource("heuristic");
    onApplied(next);
  }

  async function submit() {
    const utterance = draft.trim();
    if (!utterance) {
      setError("Tell the planner who you are and what you eat.");
      return;
    }
    setBusy(true);
    setError("");
    setWarning("");
    try {
      const res = await fetch("/api/preferences/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utterance, current: value }),
      });
      const json = (await res.json()) as {
        preferences?: UserPreference;
        summary?: string;
        source?: "llm" | "heuristic";
        warning?: string;
        error?: string;
      };
      if (!res.ok || !json.preferences) {
        throw new Error(json.error ?? "Could not understand that.");
      }
      setSource(json.source ?? "");
      setWarning(json.warning ?? "");
      onApplied(json.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not understand that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pixel-panel bg-card p-4">
      <p className="hud text-[8px] text-tartan">PREFERENCE AGENT</p>
      <h2 className="mt-2 text-base font-bold">Tell the planner about you</h2>
      <p className="mt-1 text-sm text-muted">
        Write in English. The agent turns it into hard constraints and ranking
        preferences. The optimizer itself stays deterministic.
      </p>
      <button
        type="button"
        disabled={busy || busyPlan}
        onClick={loadDemoPersona}
        className="pixel-chip mt-3 min-h-10 w-full bg-gold text-sm"
      >
        Load demo persona
      </button>
      <p className="mt-2 text-xs font-bold text-muted">
        {agentReady === true
          ? "Using your configured LLM API."
          : agentReady === false
            ? "API key not detected — local parser only."
            : "Checking agent…"}
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Preference description</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder={DEMO_PERSONA_UTTERANCE}
          className="min-h-28 w-full border-4 border-ink bg-white px-3 py-2 text-sm leading-6"
        />
      </label>
      <button
        type="button"
        disabled={busy || busyPlan}
        onClick={() => void submit()}
        className="pixel-btn mt-3 min-h-11 w-full bg-tartan text-sm text-white disabled:opacity-60"
      >
        {busy ? "Understanding…" : "Update preferences"}
      </button>
      {error && <p className="mt-2 text-sm font-bold text-gold">{error}</p>}
      {warning && <p className="mt-2 text-sm font-bold text-tartan">{warning}</p>}
      {value.preference_summary && (
        <div className="mt-3 border-4 border-ink bg-[#fffaf0] px-3 py-2 text-sm leading-6">
          <p className="text-xs font-bold uppercase text-muted">
            Understood{source ? ` · ${source}` : ""}
          </p>
          <p className="mt-1 font-bold">
            {englishPreferenceSummary(value, value.preference_summary)}
          </p>
          <p className="mt-2 text-muted">{describePreferences(value)}</p>
        </div>
      )}
    </section>
  );
}
