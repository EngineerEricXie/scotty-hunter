import type { MealType, PlannerRequest, UserPreference } from "@/lib/types";
import { isDemoClockActive } from "@/lib/demo-clock";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snacks", "dinner"];

export function mealsFromPrefs(prefs: UserPreference): MealType[] {
  const wanted = new Set<MealType>();
  if (prefs.wants_breakfast) wanted.add("breakfast");
  if (prefs.wants_lunch) wanted.add("lunch");
  if (prefs.wants_snacks) wanted.add("snacks");
  if (prefs.wants_dinner) wanted.add("dinner");
  const meals = MEAL_ORDER.filter((meal) => wanted.has(meal));
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
    demo_clock: isDemoClockActive(),
  };
}
