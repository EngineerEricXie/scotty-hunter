import type { MealType, PlannerRequest, UserPreference } from "@/lib/types";

export function mealsFromPrefs(prefs: UserPreference): MealType[] {
  const meals: MealType[] = [];
  if (prefs.wants_breakfast) meals.push("breakfast");
  if (prefs.wants_lunch) meals.push("lunch");
  if (prefs.wants_dinner) meals.push("dinner");
  if (prefs.wants_snacks) meals.push("snacks");
  return meals.length ? meals : ["lunch", "dinner"];
}

export function plannerRequestFromPrefs(
  prefs: UserPreference,
  date: string,
  mode: "day" | "week" = "day",
): PlannerRequest {
  return {
    date,
    meals: mealsFromPrefs(prefs),
    max_walking_minutes: prefs.max_walking_minutes,
    start_building_id: prefs.home_building_id,
    include_likely: prefs.include_likely,
    explicit_only: prefs.explicit_only,
    allow_expired_registration: false,
    allow_possible_food: prefs.allow_possible_food,
    dietary_constraints: prefs.dietary_constraints,
    favorite_foods: prefs.favorite_foods,
    disliked_foods: prefs.disliked_foods,
    preferred_cuisines: prefs.preferred_cuisines,
    willing_to_rsvp: prefs.willing_to_rsvp,
    preferred_event_types: prefs.preferred_event_types,
    disliked_event_types: prefs.disliked_event_types,
    ideal_walking_minutes: prefs.ideal_walking_minutes,
    campus_days: prefs.campus_days,
    mode,
  };
}
