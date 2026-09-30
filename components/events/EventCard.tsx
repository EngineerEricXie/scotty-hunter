import type { Event } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { formatTimeRange } from "@/lib/timezone";
import { getBuilding } from "@/lib/maps/buildings";
import { ArrowUpRight, Clock3, MapPin, Check } from "lucide-react";

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
      className={`food-card ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
    >
      <div className="food-card-top">
        <span className="food-card-emoji" aria-hidden="true">
          {foodEmoji(event)}
        </span>
        <span
          className={`food-card-status ${event.food_status === "EXPLICIT" ? "is-confirmed" : ""}`}
        >
          {event.food_status === "EXPLICIT" && <Check size={12} />}
          {event.food_status === "EXPLICIT" ? "Food confirmed" : "Food likely"}
        </span>
        <ArrowUpRight size={17} className="food-card-arrow" />
      </div>
      <h3>{event.title}</h3>
      <div className="food-card-meta">
        <span>
          <Clock3 size={13} />
          {formatTimeRange(event.start_time, event.end_time)}
        </span>
        <span>
          <MapPin size={13} />
          {building?.short_name ?? "Location unconfirmed"}
          {event.room ? ` · ${event.room}` : ""}
        </span>
      </div>
      {event.registration_required && (
        <span className="food-card-rsvp">RSVP needed · Save a reminder</span>
      )}
    </button>
  );
}
