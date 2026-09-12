import { foodEmoji, markerHour } from "@/lib/food-ui";
import type { Event } from "@/lib/types";

export function createFoodMarkerElement(
  event: Event,
  selected: boolean,
  planned = false,
  options?: {
    count?: number;
    hourLabel?: string;
    stopNumber?: number;
  },
): HTMLButtonElement {
  const button = document.createElement("button");
  const count = options?.count ?? 1;
  const hour = options?.hourLabel ?? markerHour(event.start_time);
  button.type = "button";
  button.className = "food-marker";
  button.dataset.status = event.food_status;
  button.dataset.selected = selected ? "true" : "false";
  button.dataset.planned = planned ? "true" : "false";
  button.dataset.cluster = count > 1 ? "true" : "false";
  button.setAttribute(
    "aria-label",
    count > 1
      ? `${count} food drops including ${event.title}${planned ? ", on your plan" : ""}`
      : `${event.title}, ${event.food_status.toLowerCase()} food, ${hour}${planned ? ", on your plan" : ""}`,
  );
  const stop = options?.stopNumber
    ? `<span class="stop" aria-hidden="true">${options.stopNumber}</span>`
    : "";
  const badge = count > 1 ? `<span class="count" aria-hidden="true">${count}</span>` : "";
  button.innerHTML = `${stop}<span aria-hidden="true">${foodEmoji(event)}</span><span class="hour">${hour}</span>${badge}`;
  return button;
}

export function createStartMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "route-start-marker";
  el.setAttribute("aria-label", "Start of today's meal path");
  el.innerHTML = `<span>START</span>`;
  return el;
}
