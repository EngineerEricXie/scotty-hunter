import type { Event, FoodStatus, MealType } from "@/lib/types";
import { inferMeal } from "@/lib/planner/score-event";

export function foodEmoji(event: Event): string {
  if (event.food_types.includes("pizza")) return "🍕";
  if (event.food_types.includes("dessert")) return "🍪";
  if (event.food_types.includes("breakfast") || event.food_types.includes("brunch")) {
    return "🥯";
  }
  if (event.food_types.includes("snacks") || event.food_types.includes("refreshments")) {
    return "🍪";
  }
  if (event.food_types.includes("dinner")) return "🥗";
  if (event.food_types.includes("lunch")) return "🥪";
  switch (inferMeal(event)) {
    case "breakfast":
      return "🥯";
    case "lunch":
      return "🥪";
    case "dinner":
      return "🥗";
    default:
      return "🍪";
  }
}

export function markerHour(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
  }).format(new Date(iso));
}

export function statusTone(status: FoodStatus): string {
  switch (status) {
    case "EXPLICIT":
      return "confirmed";
    case "LIKELY":
      return "likely";
    case "POSSIBLE":
      return "possible";
    default:
      return "none";
  }
}

export function mealLabel(meal: MealType): string {
  return meal[0].toUpperCase() + meal.slice(1);
}
