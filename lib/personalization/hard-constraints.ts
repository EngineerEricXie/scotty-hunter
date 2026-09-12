import type { Event, MealType, PlannerRequest } from "@/lib/types";
import { inferMeal, mealMatchScore } from "@/lib/planner/score-event";
import { canAttend } from "@/lib/planner/conflicts";
import { worstDietaryCompatibility } from "@/lib/personalization/dietary-compatibility";

export function foodConfidenceAllowed(event: Event, request: PlannerRequest): boolean {
  if (event.food_status === "NONE") return false;
  if (request.explicit_only) return event.food_status === "EXPLICIT";
  if (request.allow_possible_food && event.food_status === "POSSIBLE") return true;
  if (!request.include_likely) return event.food_status === "EXPLICIT";
  return event.food_status === "EXPLICIT" || event.food_status === "LIKELY";
}

export function hardRejectReasons(
  event: Event,
  request: PlannerRequest,
  options: {
    meal: MealType;
    walkingMinutes: number;
    originBuildingId: string | null;
    previous: Event | null;
    now: Date;
  },
): string[] {
  const reasons: string[] = [];
  if (event.food_status === "NONE") reasons.push("no food evidence");
  if (!foodConfidenceAllowed(event, request)) {
    reasons.push(
      request.explicit_only
        ? "filtered: explicit food only"
        : "food confidence below your minimum",
    );
  }
  if (mealMatchScore(event, options.meal) <= 0) {
    reasons.push(`does not match ${options.meal}`);
  }
  if (
    options.walkingMinutes > request.max_walking_minutes &&
    event.building_id !== options.originBuildingId
  ) {
    reasons.push(`exceeds ${request.max_walking_minutes}-minute walking limit`);
  }
  if (
    !canAttend(options.previous, event, options.walkingMinutes, {
      allowExpiredRegistration: request.allow_expired_registration,
      now: options.now,
    })
  ) {
    if (options.previous && event.start_time <= (options.previous.end_time ?? options.previous.start_time)) {
      reasons.push("overlaps with another selected event");
    } else if (
      event.registration_required &&
      event.registration_deadline &&
      new Date(event.registration_deadline).getTime() < options.now.getTime() &&
      !request.allow_expired_registration
    ) {
      reasons.push("registration deadline passed");
    } else if (options.previous) {
      reasons.push("insufficient travel time between events");
    }
  }
  const diet = worstDietaryCompatibility(event, request.dietary_constraints ?? []);
  if (diet === "INCOMPATIBLE") {
    reasons.push("known incompatible food option");
  }
  if (
    (request.willing_to_rsvp ?? "only_if_worth_it") === "no" &&
    (event.registration_status === "REQUIRED" || event.registration_required)
  ) {
    reasons.push("RSVP required and you chose not to register");
  }
  return reasons;
}

export function passesHardConstraints(
  event: Event,
  request: PlannerRequest,
  options: {
    meal: MealType;
    walkingMinutes: number;
    originBuildingId: string | null;
    previous: Event | null;
    now: Date;
  },
): boolean {
  return hardRejectReasons(event, request, options).length === 0;
}

export function inferredMeal(event: Event): MealType {
  return inferMeal(event);
}
