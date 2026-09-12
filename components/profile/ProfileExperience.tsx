"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { UnavailableIntegration } from "@/components/ui/States";
import { StatusBar } from "@/components/ui/PressStart";
import { loadScotty } from "@/lib/scotty/state";

interface SourceRow {
  id: string;
  name: string;
  last_error: string | null;
  last_success_at: string | null;
  enabled: boolean;
  parser_type: string;
}

export function ProfileExperience() {
  const [points, setPoints] = useState(0);
  const [sources, setSources] = useState<SourceRow[]>([]);

  useEffect(() => {
    const boot = window.setTimeout(() => setPoints(loadScotty().points), 0);
    fetch("/api/sources")
      .then((res) => res.json())
      .then((json: { sources?: SourceRow[] }) => setSources(json.sources ?? []))
      .catch(() => undefined);
    return () => window.clearTimeout(boot);
  }, []);

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card p-4">
          <StatusBar right="LAB" />
          <h1 className="hud mt-3 text-[13px] leading-6">SYSTEM LAB</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Preferences and points stay in this browser. No account required.
          </p>
          <div className="mt-4 border-4 border-ink bg-ink p-3 text-gold">
            <p className="hud text-[8px]">POINTS</p>
            <p className="text-3xl font-bold">{points}</p>
            <p className="mt-1 text-xs text-white/70">Raise Scotty on the pet screen to earn more.</p>
          </div>
          <Link href="/scotty" className="pixel-btn mt-3 flex min-h-11 items-center justify-center bg-gold text-sm">
            OPEN SCOTTY + FOOD DEX
          </Link>
        </div>

        <section className="mt-4 space-y-3">
          <UnavailableIntegration
            name="Supabase"
            detail="Repository mode is local-fixture until a Supabase URL and key are provided."
          />
          <UnavailableIntegration
            name="LLM extraction"
            detail="Heuristic extractor is the default. Set EXTRACTION_PROVIDER=llm plus an API key to activate the scaffold."
          />
        </section>

        <section className="pixel-panel mt-4 bg-card p-4">
          <h2 className="font-bold">Source health</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sources.map((source) => (
              <li key={source.id}>
                <p className="font-bold">{source.name}</p>
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
