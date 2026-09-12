import type { Event } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { formatTimeRange } from "@/lib/timezone";
import { getBuilding } from "@/lib/maps/buildings";
import { FoodConfidenceBadge } from "@/components/events/FoodConfidenceBadge";
import { RegistrationBadge } from "@/components/events/RegistrationBadge";

export function EventCard({
  event,
  selected,
  onSelect,
}: {
  event: Event;
  selected?: boolean;
  onSelect?: (event: Event) => void;
}) {
  const building = getBuilding(event.building_id);
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`w-full rounded-[20px] border bg-white px-4 py-3 text-left shadow-[0_4px_18px_rgba(28,28,30,0.05)] transition ${
        selected ? "border-tartan" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-canvas text-lg" aria-hidden>
          {foodEmoji(event)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{event.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {formatTimeRange(event.start_time, event.end_time)}
            {" · "}
            {building?.short_name ?? "Unresolved location"}
            {event.room ? ` ${event.room}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <FoodConfidenceBadge
              status={event.food_status}
              confidence={event.food_confidence}
            />
            <RegistrationBadge
              required={event.registration_required}
              deadline={event.registration_deadline}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
