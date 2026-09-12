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
      <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_18px_50px_rgba(28,28,30,0.16)]">
        <div className="flex justify-center pt-2 md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="max-h-[52vh] overflow-y-auto px-5 pb-5 pt-3 md:max-h-[72vh]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold leading-6">
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
              className="grid h-10 w-10 place-items-center rounded-full bg-canvas text-muted"
              aria-label="Close event details"
            >
              ✕
            </button>
          </div>

          <p className="mt-3 text-sm text-ink">
            {building?.name ?? "Location not resolved"}
            {event.room ? ` · ${event.room}` : ""}
            {event.floor ? ` · Floor ${event.floor}` : ""}
          </p>
          <p className="text-sm text-muted">About {walk} min walk from Gates</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <FoodConfidenceBadge
              status={event.food_status}
              confidence={event.food_confidence}
            />
            <RegistrationBadge
              required={event.registration_required}
              deadline={event.registration_deadline}
            />
          </div>

          {event.food_status !== "NONE" && (
            <blockquote className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm leading-6">
              <p className="font-semibold">
                {foodStatusLabel(event.food_status)} ·{" "}
                {Math.round(event.food_confidence * 100)}% confidence
              </p>
              <p className="mt-1 text-muted">
                {event.food_evidence
                  ? `“${event.food_evidence}”`
                  : "No supporting quote was preserved."}
              </p>
            </blockquote>
          )}

          {event.food_types.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Food type: {event.food_types.join(", ")}
            </p>
          )}

          {event.registration_required && (
            <div className="mt-4 rounded-2xl border border-tartan/20 bg-tartan/5 px-4 py-3 text-sm">
              <p className="font-semibold text-tartan">
                Register
                {event.registration_deadline
                  ? ` by ${relativeDeadline(event.registration_deadline)}`
                  : ""}
              </p>
              <p className="mt-1 text-muted">
                ScottyBites never submits external forms for you.
              </p>
            </div>
          )}

          <AvailabilityRow key={event.id} eventId={event.id} />
          <FloorSelector buildingId={event.building_id} floor={event.floor} />

          <p className="mt-4 text-xs leading-5 text-muted">
            Source: {event.provenance_note}
            {event.source_url ? ` · ${event.source_url}` : ""}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAddToPlan(event)}
              className="min-h-11 rounded-2xl bg-ink text-sm font-semibold text-white"
            >
              Add to Plan
            </button>
            {event.registration_url ? (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-11 place-items-center rounded-2xl bg-canvas text-sm font-semibold"
              >
                Register
              </a>
            ) : (
              <a
                href={`/api/calendar?eventId=${event.id}`}
                className="grid min-h-11 place-items-center rounded-2xl bg-canvas text-sm font-semibold"
              >
                Calendar .ics
              </a>
            )}
          </div>
          {event.registration_required && (
            <button
              type="button"
              onClick={() => onAddTodo(event)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-line text-sm font-semibold"
            >
              Save RSVP To-Do
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
