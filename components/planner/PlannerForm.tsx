"use client";

import type { MealType, UserPreference } from "@/lib/types";
import { BUILDINGS } from "@/lib/maps/buildings";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export function PlannerForm({
  value,
  date,
  onChangeDate,
  onChange,
  onSubmit,
  busy,
}: {
  value: UserPreference;
  date: string;
  onChangeDate: (date: string) => void;
  onChange: (next: UserPreference) => void;
  onSubmit: () => void;
  busy?: boolean;
}) {
  function toggleMeal(field: "wants_breakfast" | "wants_lunch" | "wants_dinner" | "wants_snacks") {
    onChange({ ...value, [field]: !value[field] });
  }

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
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm"
        />
      </label>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Meals</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEALS.map((meal) => {
            const key =
              meal === "breakfast"
                ? "wants_breakfast"
                : meal === "lunch"
                  ? "wants_lunch"
                  : meal === "dinner"
                    ? "wants_dinner"
                    : "wants_snacks";
            const active = value[key];
            return (
              <button
                type="button"
                key={meal}
                onClick={() => toggleMeal(key)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  active ? "bg-ink text-white" : "border border-line bg-white"
                }`}
              >
                {meal[0].toUpperCase() + meal.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Max walking time · {value.max_walking_minutes} min
        </span>
        <input
          type="range"
          min={5}
          max={30}
          value={value.max_walking_minutes}
          onChange={(e) =>
            onChange({ ...value, max_walking_minutes: Number(e.target.value) })
          }
          className="mt-2 w-full"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Starting building
        </span>
        <select
          value={value.home_building_id}
          onChange={(e) => onChange({ ...value, home_building_id: e.target.value })}
          className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm"
        >
          {BUILDINGS.filter((b) => !b.off_campus).map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              explicit_only: !value.explicit_only,
              include_likely: value.explicit_only,
            })
          }
          className={`min-h-11 flex-1 rounded-2xl text-sm font-semibold ${
            value.explicit_only ? "bg-ink text-white" : "border border-line bg-white"
          }`}
        >
          Explicit only
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              include_likely: !value.include_likely,
              explicit_only: false,
            })
          }
          className={`min-h-11 flex-1 rounded-2xl text-sm font-semibold ${
            value.include_likely && !value.explicit_only
              ? "bg-ink text-white"
              : "border border-line bg-white"
          }`}
        >
          Include likely
        </button>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-2xl bg-tartan text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Planning…" : "Plan my free food day"}
      </button>
    </form>
  );
}
