"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { StatusBar } from "@/components/ui/PressStart";
import { ScottySprite } from "@/components/pet/ScottySprite";
import { PhotoCheckIn } from "@/components/checkin/PhotoCheckIn";
import { ATLAS_SPECIES } from "@/lib/scotty/atlas";
import {
  atlasProgress,
  feedTreat,
  loadScotty,
  onScottyChange,
  QUESTS,
  scottyMood,
  scottyRank,
  type ScottyState,
} from "@/lib/scotty/state";
import { useEffect } from "react";

const RIVALS = [
  { name: "PixelTartan", points: 186 },
  { name: "RangosRaider", points: 142 },
  { name: "WeanWalker", points: 97 },
];

export function ScottyExperience() {
  const [state, setState] = useState<ScottyState>(loadScotty);
  const [action, setAction] = useState<"idle" | "eat" | "hungry">("idle");
  const [treatNote, setTreatNote] = useState("");

  useEffect(() => {
    const refresh = () => setState(loadScotty());
    return onScottyChange(refresh);
  }, []);

  const mood = scottyMood(state);
  const progress = atlasProgress(state);
  const board = useMemo(() => {
    return [...RIVALS, { name: "YOU", points: state.points }].sort((a, b) => b.points - a.points);
  }, [state.points]);

  function treat() {
    const next = feedTreat();
    if ("error" in next) {
      setTreatNote(next.error);
      return;
    }
    setAction("eat");
    setTreatNote("Scotty chomped a tartan biscuit.");
    window.setTimeout(() => setAction("idle"), 900);
  }

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card p-3">
          <StatusBar right="PET" />
          <div className="mt-3 grid grid-cols-[140px_1fr] gap-3">
            <div className="border-4 border-ink bg-sky p-2">
              <ScottySprite mood={mood} action={mood === "hungry" ? "hungry" : action} />
            </div>
            <div>
              <p className="hud text-[10px]">{state.name}</p>
              <p className="mt-1 text-sm font-bold">{scottyRank(state.xp)}</p>
              <p className="mt-2 text-sm">
                HP {state.hunger}/100 · XP {state.xp} · {state.points} PTS
              </p>
              <div className="mt-2 h-3 border-4 border-ink bg-white">
                <div className="h-full bg-tartan" style={{ width: `${state.hunger}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold uppercase text-muted">{mood}</p>
            </div>
          </div>
          <button type="button" onClick={treat} className="pixel-btn mt-3 min-h-11 w-full bg-gold text-sm">
            TREAT (−12 PTS)
          </button>
          {treatNote && <p className="mt-2 text-sm font-bold">{treatNote}</p>}
        </div>

        <section className="pixel-panel mt-4 bg-card p-3">
          <p className="hud text-[9px] text-tartan">FOOD DEX {progress.caught}/{progress.total}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ATLAS_SPECIES.map((species) => {
              const caught = state.atlas[species.id];
              return (
                <article
                  key={species.id}
                  className={`border-4 border-ink p-2 ${caught ? "bg-[#fffaf0]" : "bg-[#cbbfa6]"}`}
                >
                  <p className="text-2xl" aria-hidden>
                    {caught ? species.pixels : "■"}
                  </p>
                  <p className="hud mt-1 text-[8px]">{caught ? species.name : "???"} </p>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {caught ? `x${caught.count} · ${species.rarity}` : species.rarity}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <PhotoCheckIn />

        <section className="pixel-panel mt-4 bg-card p-3">
          <p className="hud text-[9px]">QUESTS</p>
          <ul className="mt-2 space-y-2">
            {QUESTS.map((quest) => (
              <li key={quest.id} className="flex items-start justify-between gap-2 border-4 border-ink bg-[#fffaf0] p-2">
                <div>
                  <p className="text-sm font-bold">{quest.title}</p>
                  <p className="text-xs text-muted">{quest.detail}</p>
                </div>
                <span className="hud text-[8px]">{state.quests[quest.id] ? "DONE" : `${quest.xp}XP`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pixel-panel mt-4 bg-ink p-3 text-gold">
          <p className="hud text-[9px]">TARTAN HUNTERS</p>
          <ol className="mt-2 space-y-1 text-sm">
            {board.map((row, index) => (
              <li key={row.name} className={row.name === "YOU" ? "font-bold text-white" : ""}>
                {index + 1}. {row.name} · {row.points}
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-4 text-center text-xs font-bold">
          <Link href="/profile" className="underline">
            Open lab / source health
          </Link>
        </p>
      </main>
      <BottomNav current="/scotty" />
    </div>
  );
}
