import { z } from "zod";

export const PlannerRequestSchema = z.object({
  date: z.string(),
  meals: z.array(z.enum(["breakfast", "lunch", "dinner", "snacks"])).min(1),
  max_walking_minutes: z.number().min(1).max(60),
  start_building_id: z.string(),
  include_likely: z.boolean(),
  explicit_only: z.boolean(),
  allow_expired_registration: z.boolean().optional(),
  allow_possible_food: z.boolean().optional(),
  dietary_constraints: z.array(z.string()).optional(),
  favorite_foods: z.array(z.string()).optional(),
  disliked_foods: z.array(z.string()).optional(),
  preferred_cuisines: z.array(z.string()).optional(),
  willing_to_rsvp: z.enum(["yes", "only_if_worth_it", "no"]).optional(),
  preferred_event_types: z.array(z.string()).optional(),
  disliked_event_types: z.array(z.string()).optional(),
  ideal_walking_minutes: z.number().optional(),
  campus_days: z
    .array(
      z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ]),
    )
    .optional(),
  mode: z.enum(["day", "week"]).optional(),
  demo_clock: z.boolean().optional(),
});
