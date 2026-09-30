"use client";

import { IS_STATIC_DEMO } from "@/lib/runtime";
import { appFetch } from "@/lib/api-client";
import { useEffect, useState } from "react";
import type { UserPreference } from "@/lib/types";
import {
  describePreferences,
  englishPreferenceSummary,
} from "@/lib/personalization/apply-patch";
import {
  applyDemoPersona,
  DEMO_PERSONA_UTTERANCE,
} from "@/lib/personalization/demo-persona";

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
  const [agentLabel, setAgentLabel] = useState("Checking agent…");

  useEffect(() => {
    appFetch("/api/preferences/parse")
      .then((res) => res.json())
      .then(
        (json: { agent_ready?: boolean; provider?: string; model?: string | null }) => {
          setAgentReady(Boolean(json.agent_ready));
          if (json.agent_ready && json.provider === "grok") {
            setAgentLabel(
              json.model
                ? `Using Grok (${json.model}) for preference parsing.`
                : "Using Grok for preference parsing.",
            );
          } else if (json.agent_ready) {
            setAgentLabel("Using your configured LLM API.");
          } else {
            setAgentLabel(
              IS_STATIC_DEMO
                ? "Local preference parser · no account or API key needed."
                : "GROK_API not detected — local parser only.",
            );
          }
        },
      )
      .catch(() => {
        setAgentReady(false);
        setAgentLabel(
          IS_STATIC_DEMO
            ? "Local preference parser · no account or API key needed."
            : "GROK_API not detected — local parser only.",
        );
      });
  }, []);

  // A parent reset or loaded persona replaces the editing draft immediately.
  // Guarded render-time synchronization avoids a stale frame and an effect loop.
  const [syncedUtterance, setSyncedUtterance] = useState(value.last_preference_utterance);
  if (syncedUtterance !== value.last_preference_utterance) {
    const utterance = value.last_preference_utterance;
    setSyncedUtterance(utterance);
    setDraft(/[\u4e00-\u9fff]/.test(utterance) ? "" : utterance);
    if (!utterance) {
      setError("");
      setWarning("");
      setSource("");
    }
  }

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
      const res = await appFetch("/api/preferences/parse", {
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
        {agentReady === null ? "Checking agent…" : agentLabel}
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
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-tartan">
          {error}
        </p>
      )}
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
