import { NextResponse } from "next/server";
import { PlannerRequestSchema } from "@/lib/planner/request-schema";
import { getEventRepository } from "@/lib/db";
import { applyCorpusBoost } from "@/lib/community/boost";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { buildWeekPlan } from "@/lib/planner/build-week";
import { frozenDemoNow } from "@/lib/demo-clock";



export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = PlannerRequestSchema.safeParse(json);
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
    const now = parsed.data.demo_clock ? frozenDemoNow() : new Date();
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
