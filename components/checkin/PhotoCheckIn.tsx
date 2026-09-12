"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "@/lib/config";
import {
  confirmPhoto,
  isMenuUnlocked,
  loadScotty,
  onScottyChange,
} from "@/lib/scotty/state";
import { ATLAS_BY_ID } from "@/lib/scotty/atlas";
import { getHiddenMenu, type HiddenMenu, type HiddenMenuDish } from "@/lib/vision/hidden-menu";
import { APP_RESET_EVENT } from "@/lib/storage/local-state";

export function PhotoCheckIn({
  eventId,
  title,
  buildingId,
  onDone,
}: {
  eventId?: string | null;
  title?: string;
  buildingId?: string | null;
  onDone?: () => void;
}) {
  const menu = useMemo(() => getHiddenMenu(eventId), [eventId]);
  const [, setScottyTick] = useState(0);
  const unlocked = isMenuUnlocked(eventId, loadScotty());
  const [note, setNote] = useState(() =>
    menu
      ? isMenuUnlocked(eventId)
        ? "Table photo matched a hidden menu the public listing omitted."
        : "Official copy is incomplete. Snap the table to unlock the real dishes."
      : "Camera → Grok labels → Food Dex.",
  );
  const [labels, setLabels] = useState<string[]>([]);
  const [atlasIds, setAtlasIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const previewRef = useRef<string | null>(null);

  function lockedNote() {
    return menu
      ? "Official copy is incomplete. Snap the table to unlock the real dishes."
      : "Camera → Grok labels → Food Dex.";
  }

  function clearPhotoUi() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setLabels([]);
    setAtlasIds([]);
    setResult(null);
    setJustUnlocked(false);
    setNote(lockedNote());
  }

  useEffect(() => {
    return onScottyChange(() => setScottyTick((tick) => tick + 1));
  }, []);

  useEffect(() => {
    const onReset = () => clearPhotoUi();
    window.addEventListener(APP_RESET_EVENT, onReset);
    return () => window.removeEventListener(APP_RESET_EVENT, onReset);
  }, [menu]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function onFile(file: File | null) {
    if (!file) return;
    setResult(null);
    setJustUnlocked(false);
    if (!file.type.startsWith("image/")) {
      setNote("Only images are accepted.");
      return;
    }
    if (file.size > APP_CONFIG.maxUploadBytes) {
      setNote("Image is too large (max 4 MB).");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setBusy(true);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        body: (() => {
          const form = new FormData();
          form.append("file", file);
          if (eventId) form.append("eventId", eventId);
          return form;
        })(),
      });
      const json = (await res.json()) as {
        labels?: string[];
        atlasIds?: string[];
        note?: string;
        hiddenMenu?: HiddenMenu | null;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setNote(json.detail ? `${json.error ?? "Could not scan that photo."} ${json.detail}` : (json.error ?? "Could not scan that photo."));
        return;
      }
      const nextLabels = json.labels ?? [];
      setLabels(nextLabels);
      setAtlasIds(json.atlasIds ?? []);
      setNote(json.note ?? "Grok labeled the photo.");

      if (nextLabels.length > 0) {
        const next = confirmPhoto({
          eventId: eventId ?? null,
          title,
          buildingId,
          labels: nextLabels,
          unlockHiddenMenu: Boolean(json.hiddenMenu),
        });
        const unlockedMenu = Boolean(json.hiddenMenu);
        setJustUnlocked(unlockedMenu);
        setScottyTick((tick) => tick + 1);
        setResult(
          unlockedMenu
            ? `Hidden menu unlocked · +${next.points} pts`
            : `+${next.points} pts · ${
                next.newSpecies.length
                  ? `NEW ${next.newSpecies.map((id) => ATLAS_BY_ID[id]?.name).join(", ")}`
                  : "Dex updated"
              }`,
        );
        onDone?.();
      }
    } finally {
      setBusy(false);
    }
  }

  if (menu) {
    return (
      <section className="mt-4 border-4 border-ink bg-[#fffaf0] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="hud text-[8px] text-tartan">HIDDEN MENU</p>
          <span className={`hud text-[8px] ${unlocked ? "text-sage" : "text-muted"}`}>
            {unlocked ? "UNLOCKED" : "LOCKED"}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold leading-5">{note}</p>
        <p className="mt-1 text-xs font-bold text-muted">
          Public listing: “{menu.publicListing}”
        </p>

        <DishGrid dishes={menu.dishes} unlocked={unlocked} reveal={justUnlocked} />

        {unlocked && (
          <p className="mt-2 text-xs font-bold leading-5 text-sage">{menu.scoutBlurb}</p>
        )}

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Uploaded table photo"
            className="mt-3 h-24 w-full border-4 border-ink object-cover"
          />
        )}

        <label className="pixel-btn mt-3 flex min-h-11 items-center justify-center bg-gold text-sm">
          {busy ? "SCANNING TABLE…" : unlocked ? "SNAP AGAIN" : "UPLOAD PHOTO TO UNLOCK"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {result && <p className="mt-2 text-sm font-bold text-sage">{result}</p>}
        {atlasIds.length > 0 && unlocked && (
          <p className="mt-1 text-xs font-bold text-muted">
            Dex: {atlasIds.map((id) => ATLAS_BY_ID[id]?.name ?? id).join(" · ")}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 border-4 border-ink bg-[#fffaf0] p-3">
      <p className="hud text-[8px] text-tartan">PHOTO → FOOD DEX</p>
      <p className="mt-1 text-sm font-bold">{note}</p>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Uploaded food photo"
          className="mt-3 h-24 w-full border-4 border-ink object-cover"
        />
      )}
      <label className="pixel-btn mt-3 flex min-h-11 items-center justify-center bg-gold text-sm">
        {busy ? "SCANNING…" : "TAKE / UPLOAD PHOTO"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {labels.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-bold">AI spotted:</p>
          <ul className="mt-1 text-sm">
            {labels.map((label) => (
              <li key={label}>• {label}</li>
            ))}
          </ul>
          {atlasIds.length > 0 && (
            <p className="mt-2 text-xs font-bold text-sage">
              Dex: {atlasIds.map((id) => ATLAS_BY_ID[id]?.name ?? id).join(" · ")}
            </p>
          )}
        </div>
      )}
      {result && <p className="mt-2 text-sm font-bold text-sage">{result}</p>}
    </section>
  );
}

function DishGrid({
  dishes,
  unlocked,
  reveal,
}: {
  dishes: HiddenMenuDish[];
  unlocked: boolean;
  reveal: boolean;
}) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2">
      {dishes.map((dish, index) => (
        <li
          key={dish.id}
          className={`border-4 border-ink px-2 py-2 ${
            unlocked ? "bg-white" : "bg-[#cbbfa6]"
          } ${reveal ? "hidden-dish-reveal" : ""}`}
          style={reveal ? { animationDelay: `${index * 70}ms` } : undefined}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl" aria-hidden>
              {unlocked ? dish.emoji : "■"}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${unlocked ? "" : "hidden-menu-locked-name"}`}>
                {unlocked ? dish.name : "Hidden dish"}
              </p>
              {unlocked && dish.dietary.length > 0 && (
                <p className="text-xs font-bold text-sage">{dish.dietary.join(" · ")}</p>
              )}
              {unlocked && dish.note && <p className="text-xs text-muted">{dish.note}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
