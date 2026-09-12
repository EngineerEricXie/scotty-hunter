"use client";

import type { UserPreference } from "@/lib/types";
import { BUILDINGS } from "@/lib/maps/buildings";

export function PlannerForm({
  value,
  date,
  onChangeDate,
  onChange,
  onSubmit,
  busy,
  submitLabel,
}: {
  value: UserPreference;
  date: string;
  onChangeDate: (date: string) => void;
  onChange: (next: UserPreference) => void;
  onSubmit: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Day</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          className="mt-1 min-h-11 w-full border-4 border-ink bg-white px-3 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Starting building
        </span>
        <select
          value={value.home_building_id}
          onChange={(e) => onChange({ ...value, home_building_id: e.target.value })}
          className="mt-1 min-h-11 w-full border-4 border-ink bg-white px-3 text-sm"
        >
          {BUILDINGS.filter((b) => !b.off_campus).map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="pixel-btn min-h-12 w-full bg-tartan text-sm text-white disabled:opacity-60"
      >
        {busy ? "Planning…" : submitLabel ?? "Plan my free food day"}
      </button>
    </form>
  );
}
