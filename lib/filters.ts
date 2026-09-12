import type { Event, FoodStatus, MealType } from "@/lib/types";
import { inferMeal } from "@/lib/planner/score-event";

export interface MapFilters {
  date: string;
  meals: MealType[];
  explicitOnly: boolean;
  includeLikely: boolean;
}

export function eventVisible(event: Event, filters: MapFilters): boolean {
  if (event.food_status === "NONE") return false;
  if (filters.explicitOnly) {
    if (event.food_status !== "EXPLICIT") return false;
  } else if (filters.includeLikely) {
    if (event.food_status !== "EXPLICIT" && event.food_status !== "LIKELY") return false;
  } else if (event.food_status !== "EXPLICIT") {
    return false;
  }
  if (filters.meals.length > 0 && !filters.meals.includes(inferMeal(event))) {
    return false;
  }
  return true;
}

export function defaultFoodStatuses(filters: MapFilters): FoodStatus[] {
  if (filters.explicitOnly) return ["EXPLICIT"];
  if (filters.includeLikely) return ["EXPLICIT", "LIKELY"];
  return ["EXPLICIT"];
}
