"use client";

import { useState } from "react";
import { APP_CONFIG } from "@/lib/config";
import { confirmPhoto } from "@/lib/scotty/state";
import { ATLAS_BY_ID } from "@/lib/scotty/atlas";

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
  const [note, setNote] = useState("Camera → mock AI labels → Food Dex.");
  const [labels, setLabels] = useState<string[]>([]);
  const [atlasIds, setAtlasIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setResult(null);
    if (!file.type.startsWith("image/")) {
      setNote("Only images are accepted.");
      return;
    }
    if (file.size > APP_CONFIG.maxUploadBytes) {
      setNote("Image is too large (max 4 MB).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
      });
      const json = (await res.json()) as {
        labels?: string[];
        atlasIds?: string[];
        note?: string;
      };
      setLabels(json.labels ?? []);
      setAtlasIds(json.atlasIds ?? []);
      setNote(json.note ?? "Mock food labels.");
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    const next = confirmPhoto({
      eventId: eventId ?? null,
      title,
      buildingId,
      labels,
    });
    setResult(
      `+${next.points} pts · ${next.newSpecies.length ? `NEW ${next.newSpecies.map((id) => ATLAS_BY_ID[id]?.name).join(", ")}` : "Dex updated"}`,
    );
    onDone?.();
  }

  return (
    <section className="mt-4 border-4 border-ink bg-[#fffaf0] p-3">
      <p className="hud text-[8px] text-tartan">PHOTO → FOOD DEX</p>
      <p className="mt-1 text-sm font-bold">{note}</p>
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
          <button type="button" onClick={confirm} className="pixel-btn mt-3 min-h-11 w-full bg-ink text-sm text-gold">
            CONFIRM + FEED SCOTTY
          </button>
        </div>
      )}
      {result && <p className="mt-2 text-sm font-bold text-sage">{result}</p>}
    </section>
  );
}
