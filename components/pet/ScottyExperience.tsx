"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { StatusBar } from "@/components/ui/PressStart";
import { ScottySprite } from "@/components/pet/ScottySprite";
import { PhotoCheckIn } from "@/components/checkin/PhotoCheckIn";
import { ATLAS_SPECIES } from "@/lib/scotty/atlas";
import { APP_RESET_EVENT } from "@/lib/storage/local-state";
import {
  atlasProgress,
  feedTreat,
  HUNTER_SPRITES,
  listUnlockedMenus,
  loadScotty,
  onScottyChange,
  QUESTS,
  renameHunter,
  renamePet,
  scottyMood,
  scottyRank,
  type ScottyState,
} from "@/lib/scotty/state";

function NameField({
  value,
  ariaLabel,
  onCommit,
  className,
}: {
  value: string;
  ariaLabel: string;
  onCommit: (next: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      aria-label={ariaLabel}
      value={draft}
      maxLength={18}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}

export function ScottyExperience({
  variant = "page",
  onClose,
}: {
  variant?: "page" | "overlay";
  onClose?: () => void;
}) {
  const [state, setState] = useState<ScottyState>(loadScotty);
  const [action, setAction] = useState<"idle" | "eat" | "hungry">("idle");
  const [treatNote, setTreatNote] = useState("");

  useEffect(() => {
    const refresh = () => setState(loadScotty());
    const onReset = () => {
      setTreatNote("");
      setAction("idle");
      refresh();
    };
    const unsub = onScottyChange(refresh);
    window.addEventListener(APP_RESET_EVENT, onReset);
    return () => {
      unsub();
      window.removeEventListener(APP_RESET_EVENT, onReset);
    };
  }, []);

  const mood = scottyMood(state);
  const progress = atlasProgress(state);
  const board = useMemo(() => {
    return [
      ...state.hunters,
      { id: "you", name: state.hunterName, animal: "terrier" as const, points: state.points },
    ].sort((a, b) => b.points - a.points);
  }, [state.hunterName, state.hunters, state.points]);

  function treat() {
    const next = feedTreat();
    if ("error" in next) {
      setTreatNote(next.error);
      return;
    }
    setAction("eat");
    setTreatNote(`${state.name} chomped a tartan biscuit.`);
    window.setTimeout(() => setAction("idle"), 900);
  }

  const overlay = variant === "overlay";

  return (
    <div className={overlay ? "pb-2" : "min-h-dvh bg-canvas pb-28"}>
      <main className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card/95 p-3">
          <StatusBar right="PET" />
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="hud text-[9px] text-muted">TAP A NAME TO RENAME</p>
            {onClose && (
              <button
                type="button"
                className="pixel-chip min-h-10 shrink-0 px-3 text-sm"
                onClick={onClose}
                aria-label="Close Scotty"
              >
                CLOSE
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-[140px_1fr] gap-3">
            <div className="overflow-hidden border-4 border-ink bg-[#fff4d6]">
              <ScottySprite mood={mood} action={mood === "hungry" ? "hungry" : action} />
            </div>
            <div>
              <NameField
                value={state.name}
                ariaLabel="Pet name"
                onCommit={(next) => renamePet(next)}
                className="hud w-full border-4 border-ink bg-white px-2 py-1 text-[10px] uppercase"
              />
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

        <section className="pixel-panel mt-4 bg-card/95 p-3">
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
        <p className="mt-2 px-1 text-xs font-bold text-muted">
          To unlock a hidden menu, open Saturday Lunch (or RI pizza) on the map and upload a table
          photo.
        </p>

        {listUnlockedMenus(state).length > 0 && (
          <section className="pixel-panel mt-4 bg-card/95 p-3">
            <p className="hud text-[9px] text-tartan">UNLOCKED MENUS</p>
            <ul className="mt-2 space-y-2">
              {listUnlockedMenus(state).map((menu) => (
                <li key={menu.eventId} className="border-4 border-ink bg-[#fffaf0] p-2">
                  <p className="text-sm font-bold">{menu.dishes.map((dish) => dish.emoji).join(" ")}</p>
                  <p className="mt-1 text-xs font-bold leading-5">{menu.scoutBlurb}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pixel-panel mt-4 bg-card/95 p-3">
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
          <p className="mt-1 text-xs font-bold text-[#f4d03f]/80">Campus animals — rename anyone.</p>
          <ol className="mt-2 space-y-2 text-sm">
            {board.map((row, index) => (
              <li key={row.id} className="flex items-center gap-2">
                <img
                  src={HUNTER_SPRITES[row.animal]}
                  alt=""
                  className="pixel-sprite h-10 w-10 shrink-0 border-2 border-gold bg-[#fff4d6] object-cover"
                />
                <span className="hud w-4 text-[8px]">{index + 1}</span>
                <NameField
                  value={row.name}
                  ariaLabel={`${row.animal} hunter name`}
                  onCommit={(next) => renameHunter(row.id, next)}
                  className={`min-w-0 flex-1 border-2 border-gold bg-[#1b1224] px-2 py-1 text-sm ${
                    row.id === "you" ? "font-bold text-white" : "text-gold"
                  }`}
                />
                <span className="hud text-[8px]">{row.points}</span>
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
      {!overlay && <BottomNav current="/scotty" />}
    </div>
  );
}
