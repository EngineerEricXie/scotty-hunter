import { z } from "zod";

const WeekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const PreferencePatchSchema = z.object({
  campus_days: z.array(WeekdaySchema).nullish(),
  wants_breakfast: z.boolean().nullish(),
  wants_lunch: z.boolean().nullish(),
  wants_dinner: z.boolean().nullish(),
  wants_snacks: z.boolean().nullish(),
  dietary_constraints: z.array(z.string()).nullish(),
  favorite_foods: z.array(z.string()).nullish(),
  disliked_foods: z.array(z.string()).nullish(),
  preferred_cuisines: z.array(z.string()).nullish(),
  max_walking_minutes: z.number().int().min(1).max(60).nullish(),
  ideal_walking_minutes: z.number().int().min(1).max(60).nullish(),
  willing_to_rsvp: z.enum(["yes", "only_if_worth_it", "no"]).nullish(),
  explicit_only: z.boolean().nullish(),
  include_likely: z.boolean().nullish(),
  home_building_id: z.string().nullish(),
  summary: z.string().min(1).default("Updated preferences from your description."),
});

export type PreferencePatch = z.infer<typeof PreferencePatchSchema>;
