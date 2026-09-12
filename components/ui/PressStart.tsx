"use client";

import { useEffect, useState } from "react";
import { markSplashSeen, loadScotty } from "@/lib/scotty/state";
import { ScottySprite } from "@/components/pet/ScottySprite";

export function PressStartGate() {
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
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
        <div className="mx-auto mt-4 w-40">
          <ScottySprite mood="happy" action="idle" />
        </div>
        <p className="mt-4 text-sm font-bold leading-6">
          Hunt free food on a pixel Carnegie Mellon map. Snap dishes, catch them in the Food Dex,
          and raise Scotty.
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
  const [clock, setClock] = useState("12:00");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
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
