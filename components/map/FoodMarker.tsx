import { foodEmoji, markerHour } from "@/lib/food-ui";
import type { Event } from "@/lib/types";

export function createFoodMarkerElement(event: Event, selected: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "food-marker";
  button.dataset.status = event.food_status;
  button.dataset.selected = selected ? "true" : "false";
  button.setAttribute(
    "aria-label",
    `${event.title}, ${event.food_status.toLowerCase()} food, ${markerHour(event.start_time)}`,
  );
  button.innerHTML = `<span aria-hidden="true">${foodEmoji(event)}</span><span class="hour">${markerHour(event.start_time)}</span>`;
  return button;
}
