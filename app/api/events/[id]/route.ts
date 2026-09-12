import { NextResponse } from "next/server";
import { getEventRepository } from "@/lib/db";
import { getBuilding } from "@/lib/maps/buildings";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const repo = getEventRepository();
    const event = await repo.getEvent(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    const building = getBuilding(event.building_id);
    return NextResponse.json({
      event,
      building,
      walking_from_ghc: walkingMinutesBetween("ghc", event.building_id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not load event.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
