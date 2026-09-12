"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { UnavailableIntegration } from "@/components/ui/States";
import {
  addPoints,
  loadPoints,
  recordCheckIn,
} from "@/lib/storage/local-state";
import { APP_CONFIG } from "@/lib/config";

interface SourceRow {
  id: string;
  name: string;
  last_error: string | null;
  last_success_at: string | null;
  enabled: boolean;
  parser_type: string;
}

export function ProfileExperience() {
  const [points, setPoints] = useState(loadPoints);
  const [labels, setLabels] = useState<string[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [note, setNote] = useState("Mock vision labels. No cloud vision API is called.");

  useEffect(() => {
    fetch("/api/sources")
      .then((res) => res.json())
      .then((json: { sources?: SourceRow[] }) => setSources(json.sources ?? []))
      .catch(() => undefined);
  }, []);

  async function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote("Only image uploads are accepted.");
      return;
    }
    if (file.size > APP_CONFIG.maxUploadBytes) {
      setNote("Image is too large (max 4 MB).");
      return;
    }
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
    });
    const json = (await res.json()) as { labels?: string[]; note?: string };
    setLabels(json.labels ?? []);
    setNote(json.note ?? "Mock labels");
  }

  function confirm() {
    recordCheckIn({
      labels,
      created_at: new Date().toISOString(),
      provider: "mock",
    });
    setPoints(addPoints(20));
  }

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(20px,env(safe-area-inset-top))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Local profile
        </p>
        <h1 className="mt-1 text-2xl font-semibold">ScottyBites</h1>
        <p className="mt-2 text-sm text-muted">
          Preferences and points stay in this browser. No account required.
        </p>

        <div className="mt-5 rounded-[22px] bg-ink p-4 text-white">
          <p className="text-sm text-white/70">Points</p>
          <p className="text-3xl font-semibold">{points}</p>
          <p className="mt-1 text-xs text-white/60">
            Photo +20 · availability report +5. Local only.
          </p>
        </div>

        <section className="mt-5 rounded-[22px] border border-line bg-white p-4">
          <h2 className="font-semibold">Food photo check-in</h2>
          <p className="mt-1 text-sm text-muted">{note}</p>
          <label className="mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-canvas text-sm font-semibold">
            Upload a photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {labels.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">AI detected (mock):</p>
              <ul className="mt-1 text-sm text-muted">
                {labels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={confirm}
                className="mt-3 min-h-11 w-full rounded-2xl bg-ink text-sm font-semibold text-white"
              >
                Confirm labels
              </button>
            </div>
          )}
        </section>

        <section className="mt-5 space-y-3">
          <UnavailableIntegration
            name="Supabase"
            detail="Repository mode is local-fixture until a Supabase URL and key are provided."
          />
          <UnavailableIntegration
            name="LLM extraction"
            detail="Heuristic extractor is the default. Set EXTRACTION_PROVIDER=llm plus an API key to activate the scaffold."
          />
        </section>

        <section className="mt-5 rounded-[22px] border border-line bg-white p-4">
          <h2 className="font-semibold">Source health</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sources.map((source) => (
              <li key={source.id}>
                <p className="font-medium">{source.name}</p>
                <p className="text-muted">
                  {source.parser_type}
                  {source.last_error ? ` · ${source.last_error}` : " · idle / fixture"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <BottomNav current="/profile" />
    </div>
  );
}
