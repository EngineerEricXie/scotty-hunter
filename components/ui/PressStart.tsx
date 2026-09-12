"use client";

import { useEffect, useState } from "react";
import { markSplashSeen, loadScotty } from "@/lib/scotty/state";
import { ScottySprite } from "@/components/pet/ScottySprite";
import { prefetchCampusEvents } from "@/lib/events-client";
import { demoClockLabel } from "@/lib/demo-clock";

export function PressStartGate() {
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    void prefetchCampusEvents().catch(() => undefined);
    const id = window.setTimeout(() => {
      setSeen(loadScotty().seenSplash);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function start() {
    setSeen(true);
    markSplashSeen();
  }

  if (!ready || seen) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b1a12]/95 px-6">
      <div className="pixel-panel max-w-sm bg-card p-5 text-center">
        <p className="hud text-[9px] text-tartan">HACKCMU 2026</p>
        <h1 className="hud mt-3 text-[16px] leading-7">SCOTTYBITES</h1>
        <p className="mt-3 text-sm font-bold leading-6">
          A personalized free-meal plan for Carnegie Mellon. Tell the agent who you are — ranking
          stays deterministic, not an LLM.
        </p>
        <div className="mx-auto mt-4 w-24">
          <ScottySprite mood="happy" action="idle" />
        </div>
        <p className="mt-3 text-xs font-bold text-muted">
          Then see it on the map, RSVP the leftovers, and keep Scotty fed.
        </p>
        <button
          type="button"
          className="pixel-btn mt-5 min-h-12 w-full bg-tartan text-sm text-white"
          onClick={start}
        >
          PRESS START
        </button>
      </div>
    </div>
  );
}

export function StatusBar({ right = "HACKCMU" }: { right?: string }) {
  const [clock, setClock] = useState(demoClockLabel());
  useEffect(() => {
    const tick = () => setClock(demoClockLabel());
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hud flex items-center justify-between text-[8px] text-gold">
      <span>SCOTTYBITES</span>
      <span>{clock}</span>
      <span className="text-tartan">{right}</span>
    </div>
  );
}
