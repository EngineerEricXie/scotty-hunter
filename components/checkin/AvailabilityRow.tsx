"use client";

import { latestAvailability, reportAvailability } from "@/lib/storage/local-state";
import { pingNowGoing } from "@/lib/scotty/state";
import type { AvailabilityStatus } from "@/lib/types";
import { useState } from "react";

const OPTIONS: { id: AvailabilityStatus; label: string; swatch: string }[] = [
  { id: "PLENTY", label: "Plenty", swatch: "🟢" },
  { id: "SOME", label: "Some", swatch: "🟡" },
  { id: "GONE", label: "Gone", swatch: "🔴" },
];

function recency(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "just now";
  return `${min} min ago`;
}

export function AvailabilityRow({
  eventId,
  title,
  buildingId,
}: {
  eventId: string;
  title?: string;
  buildingId?: string | null;
}) {
  const [report, setReport] = useState(() => latestAvailability(eventId));

  function choose(status: AvailabilityStatus) {
    const next = reportAvailability(eventId, status);
    if (status === "PLENTY" || status === "SOME") {
      pingNowGoing({
        eventId,
        title: title ?? "Free food",
        buildingId: buildingId ?? null,
        dish: status === "PLENTY" ? "Plenty left" : "Some left",
        kind: "report",
      });
    }
    setReport(next);
  }

  return (
    <div className="mt-4">
      {report ? (
        <p className="text-sm font-bold">
          {report.status === "PLENTY"
            ? "🟢 Plenty left"
            : report.status === "SOME"
              ? "🟡 Some left"
              : "🔴 Gone"}
          {" · "}
          reported {recency(report.reported_at)}
        </p>
      ) : (
        <p className="text-sm text-muted">Food remaining: unknown</p>
      )}
      <div className="mt-2 flex gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id)}
            className="pixel-btn min-h-10 flex-1 bg-white text-xs"
            aria-label={`Report ${option.label} remaining`}
          >
            {option.swatch} {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
