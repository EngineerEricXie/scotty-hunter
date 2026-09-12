"use client";

import type { MapFilters } from "@/lib/filters";
import type { MealType } from "@/lib/types";
import { addDaysIso } from "@/lib/timezone";
import { demoToday } from "@/lib/demo-clock";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export function FilterBar({
  filters,
  onChange,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}) {
  const today = demoToday();
  const tomorrow = addDaysIso(today, 1);

  function toggleMeal(meal: MealType) {
    const has = filters.meals.includes(meal);
    onChange({
      ...filters,
      meals: has ? filters.meals.filter((m) => m !== meal) : [...filters.meals, meal],
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Pill
          active={filters.date === today}
          onClick={() => onChange({ ...filters, date: today })}
        >
          Today
        </Pill>
        <Pill
          active={filters.date === tomorrow}
          onClick={() => onChange({ ...filters, date: tomorrow })}
        >
          Tomorrow
        </Pill>
        <label className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 text-sm font-semibold shadow-sm">
          <span className="sr-only">Pick a date</span>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
            className="bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEALS.map((meal) => (
          <Pill
            key={meal}
            active={filters.meals.includes(meal)}
            onClick={() => toggleMeal(meal)}
          >
            {meal[0].toUpperCase() + meal.slice(1)}
          </Pill>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Pill
          active={filters.explicitOnly}
          onClick={() =>
            onChange({
              ...filters,
              explicitOnly: !filters.explicitOnly,
              includeLikely: filters.explicitOnly ? true : false,
            })
          }
        >
          Explicit only
        </Pill>
        <Pill
          active={filters.includeLikely && !filters.explicitOnly}
          onClick={() =>
            onChange({
              ...filters,
              includeLikely: !filters.includeLikely,
              explicitOnly: false,
            })
          }
        >
          Include likely
        </Pill>
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold shadow-sm ${
        active ? "bg-ink text-white" : "border border-line bg-white text-ink"
      }`}
    >
      {children}
    </button>
  );
}
