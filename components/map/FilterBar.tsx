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
        <Pill active={filters.date === today} onClick={() => onChange({ ...filters, date: today })}>
          TODAY
        </Pill>
        <Pill
          active={filters.date === tomorrow}
          onClick={() => onChange({ ...filters, date: tomorrow })}
        >
          TOM
        </Pill>
        <label className="pixel-chip inline-flex min-h-10 items-center bg-white px-2 text-sm font-bold">
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
            {meal.toUpperCase()}
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
          EXPLICIT
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
          +LIKELY
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
      data-on={active ? "true" : "false"}
      className="pixel-chip inline-flex min-h-10 shrink-0 items-center bg-white px-3 text-xs font-bold"
    >
      {children}
    </button>
  );
}
