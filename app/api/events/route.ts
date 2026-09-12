import { NextResponse } from "next/server";
import { getEventRepository } from "@/lib/db";
import { applyCorpusBoost } from "@/lib/community/boost";
import type { FoodStatus, MealType } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const start = url.searchParams.get("start") ?? undefined;
    const end = url.searchParams.get("end") ?? undefined;
    const building = url.searchParams.get("building") ?? undefined;
    const includeNone = url.searchParams.get("include_none") === "true";
    const food_status = url.searchParams.get("food_status")
      ?.split(",")
      .filter(Boolean) as FoodStatus[] | undefined;
    const meal = url.searchParams.get("meal")
      ?.split(",")
      .filter(Boolean) as MealType[] | undefined;

    const repo = getEventRepository();
    const events = applyCorpusBoost(
      await repo.listEvents({
        date,
        start,
        end,
        building,
        food_status,
        meal,
        include_none: includeNone,
      }),
    );

    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not load events.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
