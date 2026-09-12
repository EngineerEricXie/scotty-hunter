"use client";

import { useEffect, useState } from "react";
import { liveNowGoing, onScottyChange, type NowGoingPing } from "@/lib/scotty/state";
import { demoNowMs } from "@/lib/demo-clock";

function recency(iso: string): string {
  const min = Math.max(0, Math.round((demoNowMs() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "NOW";
  return `${min}m`;
}

export function NowGoingTicker() {
  const [pings, setPings] = useState<NowGoingPing[]>([]);

  useEffect(() => {
    const refresh = () => setPings(liveNowGoing());
    refresh();
    const unsub = onScottyChange(refresh);
    const id = window.setInterval(refresh, 20_000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);

  if (pings.length === 0) {
    return (
      <p className="hud truncate text-[8px] text-ink/70">
        Radar quiet · snap a dish to ping NOW GOING
      </p>
    );
  }

  const top = pings[0];
  return (
    <p className="hud truncate text-[8px] leading-4">
      <span className="now-going text-tartan">NOW GOING</span>{" "}
      <span className="text-ink">
        {top.dish} @ {top.title} · {top.handle} {recency(top.at)}
      </span>
      {pings.length > 1 ? <span className="text-muted"> · +{pings.length - 1} live</span> : null}
    </p>
  );
}

export function NowGoingBadge({ eventId }: { eventId: string }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const refresh = () => setLive(liveNowGoing().some((ping) => ping.eventId === eventId));
    refresh();
    return onScottyChange(refresh);
  }, [eventId]);
  if (!live) return null;
  return (
    <span className="hud now-going inline-flex items-center border-4 border-ink bg-tartan px-2 py-1 text-[8px] text-gold">
      NOW GOING
    </span>
  );
}
