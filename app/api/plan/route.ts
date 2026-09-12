import { NextResponse } from "next/server";
import { z } from "zod";
import { getEventRepository } from "@/lib/db";
import { buildItinerary } from "@/lib/planner/build-itinerary";

const BodySchema = z.object({
  date: z.string(),
  meals: z.array(z.enum(["breakfast", "lunch", "dinner", "snacks"])).min(1),
  max_walking_minutes: z.number().min(1).max(60),
  start_building_id: z.string(),
  include_likely: z.boolean(),
  explicit_only: z.boolean(),
  allow_expired_registration: z.boolean().optional(),
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
    const events = await repo.listEvents({
      date: parsed.data.date,
      include_none: false,
    });
    const itinerary = buildItinerary(events, {
      ...parsed.data,
      allow_expired_registration: parsed.data.allow_expired_registration ?? false,
    });
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
