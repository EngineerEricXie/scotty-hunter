import type { Event } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { formatTimeRange } from "@/lib/timezone";
import { getBuilding } from "@/lib/maps/buildings";
import { FoodConfidenceBadge } from "@/components/events/FoodConfidenceBadge";
import { RegistrationBadge } from "@/components/events/RegistrationBadge";
import { NowGoingBadge } from "@/components/live/NowGoingTicker";

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
      className={`pixel-panel w-full px-3 py-3 text-left ${selected ? "bg-gold" : "bg-card"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center border-4 border-ink bg-white text-lg"
          aria-hidden
        >
          {foodEmoji(event)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-bold">{event.title}</p>
            <NowGoingBadge eventId={event.id} />
          </div>
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
              boosted={Boolean(event.boost_reasons?.length)}
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
