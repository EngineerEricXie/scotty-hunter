"use client";

import type { Event } from "@/lib/types";
import { foodEmoji } from "@/lib/food-ui";
import { foodStatusLabel } from "@/lib/extraction/classify-food";
import { formatTimeRange, relativeDeadline } from "@/lib/timezone";
import { getBuilding } from "@/lib/maps/buildings";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";
import { FoodConfidenceBadge } from "@/components/events/FoodConfidenceBadge";
import { RegistrationBadge } from "@/components/events/RegistrationBadge";
import { FloorSelector } from "@/components/map/FloorSelector";
import { AvailabilityRow } from "@/components/checkin/AvailabilityRow";
import { PhotoCheckIn } from "@/components/checkin/PhotoCheckIn";
import { NowGoingBadge } from "@/components/live/NowGoingTicker";

export function EventBottomSheet({
  event,
  onClose,
  onAddToPlan,
  onAddTodo,
}: {
  event: Event | null;
  onClose: () => void;
  onAddToPlan: (event: Event) => void;
  onAddTodo: (event: Event) => void;
}) {
  if (!event) return null;
  const building = getBuilding(event.building_id);
  const walk = walkingMinutesBetween("ghc", event.building_id);

  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[108px] md:inset-x-auto md:right-4 md:top-24 md:bottom-auto md:w-[380px] md:px-0 md:pb-0"
      aria-label="Event details"
    >
      <div className="pixel-panel overflow-hidden bg-card">
        <div className="max-h-[58vh] overflow-y-auto px-4 pb-4 pt-3 md:max-h-[72vh]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <NowGoingBadge eventId={event.id} />
              </div>
              <p className="text-lg font-bold leading-6">
                <span aria-hidden className="mr-1">
                  {foodEmoji(event)}
                </span>
                {event.title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatTimeRange(event.start_time, event.end_time)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn grid h-10 w-10 place-items-center bg-white"
              aria-label="Close event details"
            >
              X
            </button>
          </div>

          <p className="mt-3 text-sm font-bold">
            {building?.name ?? "Location not resolved"}
            {event.room ? ` · ${event.room}` : ""}
            {event.floor ? ` · Floor ${event.floor}` : ""}
          </p>
          <p className="text-sm text-muted">About {walk} min walk from Gates</p>

          <div className="mt-3 flex flex-wrap gap-2">
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

          {event.food_status !== "NONE" && (
            <blockquote className="mt-4 border-4 border-ink bg-[#fffaf0] px-3 py-3 text-sm leading-6">
              <p className="font-bold">
                {foodStatusLabel(event.food_status)} ·{" "}
                {Math.round(event.food_confidence * 100)}% probability
                {event.base_confidence != null &&
                event.base_confidence < event.food_confidence
                  ? ` (was ${Math.round(event.base_confidence * 100)}%)`
                  : ""}
              </p>
              <p className="mt-1 text-muted">
                {event.food_evidence
                  ? `“${event.food_evidence}”`
                  : "No supporting quote was preserved."}
              </p>
              {event.boost_reasons && event.boost_reasons.length > 0 && (
                <p className="mt-2 text-xs font-bold text-sage">
                  Boosted by: {event.boost_reasons.join(" · ")}
                </p>
              )}
            </blockquote>
          )}

          {event.food_types.length > 0 && (
            <p className="mt-3 text-sm text-muted">Food type: {event.food_types.join(", ")}</p>
          )}

          {event.registration_required && (
            <div className="mt-4 border-4 border-tartan bg-tartan px-3 py-3 text-sm text-gold">
              <p className="font-bold">
                Register
                {event.registration_deadline
                  ? ` by ${relativeDeadline(event.registration_deadline)}`
                  : ""}
              </p>
              <p className="mt-1 text-white/90">
                ScottyBites never submits external forms for you.
              </p>
            </div>
          )}

          <AvailabilityRow key={event.id} eventId={event.id} title={event.title} buildingId={event.building_id} />
          <PhotoCheckIn
            eventId={event.id}
            title={event.title}
            buildingId={event.building_id}
          />
          <FloorSelector buildingId={event.building_id} floor={event.floor} />

          <p className="mt-4 text-xs leading-5 text-muted">
            Source: {event.provenance_note}
            {event.source_url ? ` · ${event.source_url}` : ""}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAddToPlan(event)}
              className="pixel-btn min-h-11 bg-ink text-sm text-gold"
            >
              ADD TO PLAN
            </button>
            {event.registration_url ? (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noreferrer"
                className="pixel-btn grid min-h-11 place-items-center bg-white text-sm"
              >
                REGISTER
              </a>
            ) : (
              <a
                href={`/api/calendar?eventId=${event.id}`}
                className="pixel-btn grid min-h-11 place-items-center bg-white text-sm"
              >
                .ICS
              </a>
            )}
          </div>
          {event.registration_required && (
            <button
              type="button"
              onClick={() => onAddTodo(event)}
              className="pixel-btn mt-2 min-h-11 w-full bg-white text-sm"
            >
              SAVE RSVP QUEST
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
