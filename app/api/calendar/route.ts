import { NextResponse } from "next/server";
import { getEventRepository } from "@/lib/db";
import { eventToIcs, itineraryToIcs } from "@/lib/calendar/calendar-service";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { z } from "zod";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }
  const repo = getEventRepository();
  const event = await repo.getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const ics = eventToIcs(event);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.id}.ics"`,
    },
  });
}

const PlanBody = z.object({
  date: z.string(),
  meals: z.array(z.enum(["breakfast", "lunch", "dinner", "snacks"])),
  max_walking_minutes: z.number(),
  start_building_id: z.string(),
  include_likely: z.boolean(),
  explicit_only: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = PlanBody.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const repo = getEventRepository();
  const events = await repo.listEvents({ date: parsed.data.date });
  const itinerary = buildItinerary(events, {
    ...parsed.data,
    allow_expired_registration: false,
  });
  const ics = itineraryToIcs(itinerary);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="scottybites-${parsed.data.date}.ics"`,
    },
  });
}
