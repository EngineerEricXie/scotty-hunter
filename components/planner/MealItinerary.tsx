import type { Itinerary, RequiredAction } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { explainEventMeal } from "@/lib/planner/build-itinerary";
import { formatTime, formatTimeRange } from "@/lib/timezone";
import { EmptyState } from "@/components/ui/States";
import { NowGoingBadge } from "@/components/live/NowGoingTicker";

export function MealItinerary({
  plan,
  onAddTodo,
}: {
  plan: Itinerary;
  onAddTodo?: (eventId: string) => void;
}) {
  if (plan.event_count === 0) {
    return (
      <EmptyState
        title="No reliable option"
        body={plan.notes[0] ?? "Try a longer walking limit or include likely events."}
      />
    );
  }

  return (
    <ol className="space-y-3">
      {plan.items.map((item, index) => {
        if (item.kind === "event" && item.event) {
          const event = item.event;
          return (
            <li key={`${event.id}-${index}`} className="pixel-panel bg-card p-4">
              <p className="hud text-[8px] text-muted">
                {formatTimeRange(event.start_time, event.end_time)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-base font-bold">
                  {foodEmoji(event)} {event.title}
                </p>
                <NowGoingBadge eventId={event.id} />
              </div>
              <p className="text-sm text-muted">{item.subtitle}</p>
              <p className="mt-2 text-sm font-bold text-sage">{explainEventMeal(event)}</p>
              {item.walking_minutes != null && (
                <p className="text-sm text-muted">{item.walking_minutes} min walk</p>
              )}
              {item.positive_reasons && item.positive_reasons.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-bold uppercase text-muted">Why selected</p>
                  <ul className="mt-1 list-disc pl-4 text-sm">
                    {item.positive_reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.warnings && item.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm font-bold text-tartan">
                  {item.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              {event.registration_required && onAddTodo && (
                <button
                  type="button"
                  className="pixel-btn mt-3 min-h-10 bg-gold px-3 text-sm"
                  onClick={() => onAddTodo(event.id)}
                >
                  ADD RSVP TODO
                </button>
              )}
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
      {plan.unmatched_meals.map((meal) => (
        <li key={`unmatched-${meal}`} className="pixel-panel bg-card p-4">
          <p className="hud text-[8px] text-tartan">{meal.toUpperCase()}</p>
          <p className="mt-1 font-bold">No reliable option</p>
          <p className="text-sm text-muted">
            {plan.notes.find((note) => note.toLowerCase().includes(meal)) ??
              "Nothing matched your hard constraints for this meal."}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function RequiredActionsList({
  actions,
  onAddTodo,
}: {
  actions: RequiredAction[];
  onAddTodo?: (eventId: string) => void;
}) {
  if (actions.length === 0) return null;
  return (
    <section className="pixel-panel bg-card p-4">
      <h2 className="font-bold">Required actions</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {actions.map((action) => (
          <li key={`${action.event_id}-${action.deadline}`} className="border-4 border-ink p-2">
            <p className="hud text-[8px] text-tartan">{action.when.toUpperCase()}</p>
            <p className="font-bold">{action.title}</p>
            {onAddTodo && (
              <button
                type="button"
                className="pixel-btn mt-2 min-h-10 bg-gold px-3 text-sm"
                onClick={() => onAddTodo(action.event_id)}
              >
                ADD RSVP TODO
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
