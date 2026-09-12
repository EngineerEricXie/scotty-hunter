import { NextResponse } from "next/server";
import { z } from "zod";
import { getEventRepository } from "@/lib/db";
import { applyCorpusBoost } from "@/lib/community/boost";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { buildWeekPlan } from "@/lib/planner/build-week";
import { demoNow } from "@/lib/demo-clock";

const BodySchema = z.object({
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
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid planner request.", detail: parsed.error.message },
        { status: 400 },
      );
    }
    const repo = getEventRepository();
    const mode = parsed.data.mode ?? "day";
    const events = applyCorpusBoost(
      await repo.listEvents({
        date: mode === "week" ? undefined : parsed.data.date,
        include_none: false,
      }),
    );
    const requestBody = {
      ...parsed.data,
      allow_expired_registration: parsed.data.allow_expired_registration ?? false,
    };
    const now = demoNow();
    if (mode === "week") {
      const week = buildWeekPlan(events, requestBody, now);
      return NextResponse.json({ week, itinerary: week.days[0]?.itinerary ?? null });
    }
    const itinerary = buildItinerary(events, requestBody, now);
    return NextResponse.json({ itinerary });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not build a plan.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
