import type { Event, MealType, PersonalizedEventScore, PlannerRequest } from "@/lib/types";
import {
  foodConfidenceScore,
  mealMatchScore,
  offCampusFlag,
  registrationRisk,
  scheduleFitScore,
} from "@/lib/planner/score-event";
import { worstDietaryCompatibility } from "@/lib/personalization/dietary-compatibility";
import { hardRejectReasons } from "@/lib/personalization/hard-constraints";

const FAVORITE_ALIASES: Record<string, string[]> = {
  pizza: ["pizza"],
  sandwiches: ["sandwiches", "sandwich"],
  "asian food": ["asian", "chinese", "korean", "japanese"],
  asian: ["asian", "chinese", "korean", "japanese"],
  "indian food": ["indian"],
  indian: ["indian"],
  mexican: ["mexican", "tacos"],
  "mexican food": ["mexican", "tacos"],
  desserts: ["dessert", "cookies", "pastries"],
  dessert: ["dessert", "cookies", "pastries"],
  coffee: ["coffee"],
  snacks: ["snacks", "cookies"],
  "healthy food": ["salad", "healthy"],
};

function needleList(value: string): string[] {
  return FAVORITE_ALIASES[value.toLowerCase()] ?? [value.toLowerCase()];
}

function haystack(event: Event): string {
  return [
    ...event.food_items,
    ...event.food_types,
    ...event.cuisine_tags,
    event.title,
    event.description,
  ]
    .join(" ")
    .toLowerCase();
}

function preferenceOverlap(event: Event, likes: string[]): number {
  if (likes.length === 0) return 0;
  let hits = 0;
  const text = haystack(event);
  for (const like of likes) {
    if (needleList(like).some((needle) => text.includes(needle))) hits += 1;
  }
  return hits / likes.length;
}

function cuisineOverlap(event: Event, cuisines: string[]): number {
  if (cuisines.length === 0) return 0;
  const tags = event.cuisine_tags.map((tag) => tag.toLowerCase());
  const text = haystack(event);
  let hits = 0;
  for (const cuisine of cuisines) {
    const needles = needleList(cuisine);
    if (needles.some((needle) => tags.includes(needle) || text.includes(needle))) hits += 1;
  }
  return hits / cuisines.length;
}

function eventTypeScore(event: Event, request: PlannerRequest): number {
  const types = event.event_types.map((item) => item.toLowerCase());
  const preferred = request.preferred_event_types ?? [];
  const disliked = request.disliked_event_types ?? [];
  let score = 0.5;
  if (preferred.some((item) => types.includes(item.toLowerCase()))) score = 1;
  if (disliked.some((item) => types.includes(item.toLowerCase()))) score = 0;
  return score;
}

function dietaryScore(event: Event, request: PlannerRequest): number {
  const constraints = request.dietary_constraints ?? [];
  const diet = worstDietaryCompatibility(event, constraints);
  if (constraints.length === 0) return 1;
  if (diet === "COMPATIBLE") return 1;
  if (diet === "UNKNOWN") return 0.35;
  return 0;
}

function walkingNormalized(minutes: number, request: PlannerRequest): number {
  const cap = Math.max(request.max_walking_minutes, 1);
  return Math.max(0, 1 - minutes / cap);
}

function uncertaintyPenalty(event: Event, request: PlannerRequest): number {
  let penalty = 0;
  const diet = worstDietaryCompatibility(event, request.dietary_constraints ?? []);
  if ((request.dietary_constraints ?? []).length > 0 && diet === "UNKNOWN") penalty += 0.6;
  if (event.food_status === "POSSIBLE") penalty += 0.5;
  if (event.food_status === "LIKELY") penalty += 0.2;
  if (event.registration_status === "UNKNOWN") penalty += 0.2;
  if (event.location_status === "PARTIAL" || event.location_status === "UNKNOWN") penalty += 0.15;
  return Math.min(1, penalty);
}

function registrationFriction(event: Event, request: PlannerRequest, now: Date): number {
  const risk = registrationRisk(event, now);
  const willingness = request.willing_to_rsvp ?? "only_if_worth_it";
  if (willingness === "yes") return risk * 0.4;
  if (willingness === "no") return risk;
  return risk * 0.75;
}

export function matchEvent(input: {
  event: Event;
  meal: MealType;
  walkingMinutes: number;
  originBuildingId: string | null;
  previous: Event | null;
  request: PlannerRequest;
  now?: Date;
}): PersonalizedEventScore {
  const now = input.now ?? new Date();
  const { event, meal, walkingMinutes, request } = input;
  const rejectionReasons = hardRejectReasons(event, request, {
    meal,
    walkingMinutes,
    originBuildingId: input.originBuildingId,
    previous: input.previous,
    now,
  });
  const hardConstraintPassed = rejectionReasons.length === 0;

  const mealMatch = mealMatchScore(event, meal);
  const foodConf = foodConfidenceScore(event);
  const foodPref = Math.max(
    0,
    preferenceOverlap(event, request.favorite_foods ?? []) -
      preferenceOverlap(event, request.disliked_foods ?? []),
  );
  const cuisinePref = cuisineOverlap(event, request.preferred_cuisines ?? []);
  const dietary = dietaryScore(event, request);
  const walkScore = walkingNormalized(walkingMinutes, request);
  const schedule = scheduleFitScore(event, meal);
  const eventPref = eventTypeScore(event, request);
  const friction = registrationFriction(event, request, now);
  const off = offCampusFlag(event);
  const uncertain = uncertaintyPenalty(event, request);
  const ideal = request.ideal_walking_minutes ?? Math.min(10, request.max_walking_minutes);
  const walkCost = walkingMinutes + Math.max(0, walkingMinutes - ideal) * 0.25;

  const totalScore =
    foodConf * 25 +
    mealMatch * 25 +
    dietary * 25 +
    foodPref * 15 +
    cuisinePref * 10 +
    schedule * 20 +
    eventPref * 5 -
    walkCost * 1.5 -
    friction * 8 -
    off * 15 -
    uncertain * 10;

  const positiveReasons: string[] = [];
  const warnings: string[] = [];
  if (hardConstraintPassed) {
    if (mealMatch >= 1) positiveReasons.push(`matches ${meal}`);
    else if (mealMatch > 0) positiveReasons.push(`reasonable ${meal} window`);
    if (event.food_status === "EXPLICIT") positiveReasons.push("confirmed food");
    const diet = worstDietaryCompatibility(event, request.dietary_constraints ?? []);
    if (diet === "COMPATIBLE") {
      const label = (request.dietary_constraints ?? [])[0] ?? "diet";
      positiveReasons.push(`matches ${label} preference`);
    }
    if (foodPref > 0) {
      const hit = (request.favorite_foods ?? []).find((like) =>
        needleList(like).some((needle) => haystack(event).includes(needle)),
      );
      if (hit) positiveReasons.push(`${hit} is one of your favorites`);
    }
    if (cuisinePref > 0) positiveReasons.push("matches a preferred cuisine");
    if (walkingMinutes <= (request.ideal_walking_minutes ?? 10)) {
      positiveReasons.push(`${walkingMinutes}-minute walk`);
    } else {
      positiveReasons.push(`fits your schedule`);
    }
    if (schedule >= 0.6) {
      if (!positiveReasons.includes("fits your schedule")) positiveReasons.push("fits your schedule");
    }
    if (diet === "UNKNOWN" && (request.dietary_constraints ?? []).length > 0) {
      warnings.push("dietary details incomplete");
    }
    if (event.food_status === "LIKELY") {
      warnings.push("Food is likely, but not explicitly guaranteed");
    }
    if (event.food_status === "POSSIBLE") {
      warnings.push("Food is only a weak hint from the source");
    }
    if (event.registration_required) warnings.push("RSVP required");
    if (event.registration_status === "UNKNOWN") warnings.push("RSVP requirement unclear");
  }

  return {
    eventId: event.id,
    hardConstraintPassed,
    mealMatch,
    foodConfidenceScore: foodConf,
    foodPreferenceScore: foodPref,
    cuisinePreferenceScore: cuisinePref,
    dietaryCompatibilityScore: dietary,
    walkingScore: walkScore,
    scheduleFitScore: schedule,
    registrationScore: 1 - friction,
    eventTypePreferenceScore: eventPref,
    totalScore,
    positiveReasons,
    warnings,
    rejectionReasons,
  };
}
