import type { Event, MealType } from "@/lib/types";
import { getBuilding } from "@/lib/maps/buildings";
import { hourMinuteInZone } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/config";

export function foodConfidenceScore(event: Event): number {
  switch (event.food_status) {
    case "EXPLICIT":
      return 1;
    case "LIKELY":
      return 0.7;
    case "POSSIBLE":
      return 0.35;
    default:
      return 0;
  }
}

export function inferMeal(event: Event): MealType {
  const types = event.food_types;
  if (types.includes("breakfast") || types.includes("brunch")) return "breakfast";
  if (types.includes("lunch") || types.includes("pizza")) {
    const { hour } = hourMinuteInZone(new Date(event.start_time));
    if (hour >= 16) return "dinner";
    if (hour < 10.5) return "breakfast";
    return "lunch";
  }
  if (types.includes("dinner")) return "dinner";
  if (types.includes("snacks") || types.includes("refreshments")) return "snacks";

  const { hour, minute } = hourMinuteInZone(new Date(event.start_time), APP_TIMEZONE);
  const t = hour + minute / 60;
  if (t >= 6.5 && t < 10.75) return "breakfast";
  if (t >= 11 && t < 15.5) return "lunch";
  if (t >= 16.5 && t < 21.5) return "dinner";
  return "snacks";
}

export function mealMatchScore(event: Event, requested: MealType): number {
  const inferred = inferMeal(event);
  if (inferred === requested) return 1;
  if (requested === "snacks") return 0.7;
  if (inferred === "snacks" && (requested === "lunch" || requested === "dinner")) {
    return 0.4;
  }
  const { hour } = hourMinuteInZone(new Date(event.start_time));
  if (requested === "lunch" && hour >= 11 && hour <= 15) return 0.7;
  if (requested === "dinner" && hour >= 16 && hour <= 21) return 0.7;
  if (requested === "breakfast" && hour >= 6 && hour <= 11) return 0.7;
  return 0;
}

export function scheduleFitScore(event: Event, meal: MealType): number {
  const { hour, minute } = hourMinuteInZone(new Date(event.start_time));
  const t = hour + minute / 60;
  const peak =
    meal === "breakfast" ? 8.5 : meal === "lunch" ? 12 : meal === "dinner" ? 18 : 15;
  const distance = Math.abs(t - peak);
  return Math.max(0, 1 - distance / 4);
}

export function registrationRisk(event: Event, now = new Date()): number {
  if (event.registration_deadline) {
    const ms = new Date(event.registration_deadline).getTime() - now.getTime();
    if (ms < 0) return 1;
    const hours = ms / 3600000;
    if (hours <= 2) return 0.8;
    if (hours <= 24) return 0.5;
  }
  if (event.registration_required) return 0.3;
  if (event.capacity_notes && /limited|capacity|first come/i.test(event.capacity_notes)) {
    return 0.3;
  }
  return 0;
}

export function offCampusFlag(event: Event): number {
  return getBuilding(event.building_id)?.off_campus ? 1 : 0;
}

export function scoreEvent(input: {
  event: Event;
  meal: MealType;
  walkingMinutes: number;
  now?: Date;
}): number {
  const { event, meal, walkingMinutes, now } = input;
  return (
    foodConfidenceScore(event) * 30 +
    mealMatchScore(event, meal) * 25 +
    scheduleFitScore(event, meal) * 20 -
    walkingMinutes * 1.5 -
    registrationRisk(event, now) * 10 -
    offCampusFlag(event) * 15
  );
}
