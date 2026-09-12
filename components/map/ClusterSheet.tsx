"use client";

import type { Event } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { formatTimeRange } from "@/lib/timezone";
import { getBuilding } from "@/lib/maps/buildings";
import { hasHiddenMenu } from "@/lib/vision/hidden-menu";

export function ClusterSheet({
  events,
  plannedIds,
  onSelect,
  onClose,
}: {
  events: Event[];
  plannedIds: string[];
  onSelect: (event: Event) => void;
  onClose: () => void;
}) {
  if (events.length < 2) return null;
  const building = getBuilding(events[0]?.building_id);

  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[108px] md:inset-x-auto md:right-4 md:top-24 md:bottom-auto md:w-[380px] md:px-0 md:pb-0"
      aria-label="Overlapping food drops"
    >
      <div className="pixel-panel overflow-hidden bg-card">
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hud text-[8px] text-tartan">{events.length} DROPS HERE</p>
              <p className="mt-1 text-base font-bold">
                {building?.name ?? "Nearby stops"}
              </p>
              <p className="text-sm text-muted">Choose one to open details.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn grid h-10 w-10 place-items-center bg-white"
              aria-label="Close overlapping drops"
            >
              X
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {events.map((event) => {
              const planned = plannedIds.includes(event.id);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="pixel-chip flex min-h-12 w-full items-center justify-between gap-2 bg-white px-3 text-left text-sm"
                    data-on={planned ? "true" : "false"}
                  >
                    <span className="min-w-0">
                      <span aria-hidden className="mr-1">
                        {foodEmoji(event)}
                      </span>
                      <span className="font-bold">{event.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatTimeRange(event.start_time, event.end_time)}
                        {planned ? " · on your plan" : ""}
                        {hasHiddenMenu(event.id) ? " · hidden menu" : ""}
                      </span>
                    </span>
                    <span className="hud shrink-0 text-[8px]">{planned ? "PLAN" : "OPEN"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
