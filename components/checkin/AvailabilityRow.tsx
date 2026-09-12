"use client";

import { latestAvailability, reportAvailability, addPoints } from "@/lib/storage/local-state";
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

export function AvailabilityRow({ eventId }: { eventId: string }) {
  const [report, setReport] = useState(() => latestAvailability(eventId));

  function choose(status: AvailabilityStatus) {
    const next = reportAvailability(eventId, status);
    addPoints(5);
    setReport(next);
  }

  return (
    <div className="mt-4">
      {report ? (
        <p className="text-sm font-medium">
          {report.status === "PLENTY" ? "🟢 Plenty left" : report.status === "SOME" ? "🟡 Some left" : "🔴 Gone"}
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
            className="min-h-10 flex-1 rounded-2xl bg-canvas text-xs font-semibold"
            aria-label={`Report ${option.label} remaining`}
          >
            {option.swatch} {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
