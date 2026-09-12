import type { Itinerary } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { explainEventMeal } from "@/lib/planner/build-itinerary";
import { formatTime, formatTimeRange } from "@/lib/timezone";
import { EmptyState } from "@/components/ui/States";
import { NowGoingBadge } from "@/components/live/NowGoingTicker";

export function MealItinerary({ plan }: { plan: Itinerary }) {
  if (plan.event_count === 0) {
    return (
      <EmptyState
        title="No feasible itinerary"
        body={plan.notes[0] ?? "Try a longer walking limit or include likely events."}
      />
    );
  }

  return (
    <ol className="space-y-3">
      {plan.items.map((item, index) => {
        if (item.kind === "event" && item.event) {
          return (
            <li key={`${item.event.id}-${index}`} className="pixel-panel bg-card p-4">
              <p className="hud text-[8px] text-muted">
                {formatTimeRange(item.event.start_time, item.event.end_time)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-base font-bold">
                  {foodEmoji(item.event)} {item.event.title}
                </p>
                <NowGoingBadge eventId={item.event.id} />
              </div>
              <p className="text-sm text-muted">{item.subtitle}</p>
              <p className="mt-2 text-sm font-bold text-sage">{explainEventMeal(item.event)}</p>
            </li>
          );
        }
        return (
          <li key={`${item.kind}-${index}`} className="px-1">
            <p className="hud text-[8px] text-muted">{formatTime(item.at)}</p>
            <p className="text-sm font-bold">{item.title}</p>
            {item.subtitle && <p className="text-sm text-muted">{item.subtitle}</p>}
          </li>
        );
      })}
    </ol>
  );
}
