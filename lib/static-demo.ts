import { APP_CONFIG } from "@/lib/config";
import { frozenDemoNow } from "@/lib/demo-clock";
import { assetPath } from "@/lib/runtime";
import { eventToIcs, itineraryToIcs } from "@/lib/calendar/calendar-service";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { buildWeekPlan } from "@/lib/planner/build-week";
import { PlannerRequestSchema } from "@/lib/planner/request-schema";
import { inferMeal } from "@/lib/planner/score-event";
import { applyPreferencePatch, heuristicPreferencePatch } from "@/lib/personalization/apply-patch";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";
import { getHiddenMenu, hiddenMenuLabels, serializeHiddenMenu } from "@/lib/vision/hidden-menu";
import { matchAtlasIds } from "@/lib/scotty/atlas";
import { calendarDateInZone } from "@/lib/timezone";
import type { Event, Source, UserPreference } from "@/lib/types";

export interface DemoSnapshot {
  events: Event[];
  sources: Source[];
}

let snapshot: Promise<DemoSnapshot> | null = null;

function loadSnapshot(): Promise<DemoSnapshot> {
  if (!snapshot) {
    snapshot = fetch(assetPath("/demo-data.json"))
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the demo event snapshot.");
        return response.json() as Promise<DemoSnapshot>;
      })
      .catch((error) => {
        snapshot = null;
        throw error;
      });
  }
  return snapshot;
}

function filterEvents(events: Event[], search: URLSearchParams): Event[] {
  return events.filter((event) => {
    if (search.get("include_none") !== "true" && event.food_status === "NONE") return false;
    if (search.has("date") && calendarDateInZone(new Date(event.start_time)) !== search.get("date")) return false;
    if (search.get("start") && event.start_time < search.get("start")!) return false;
    if (search.get("end") && event.start_time > search.get("end")!) return false;
    if (search.get("building") && event.building_id !== search.get("building")) return false;
    if (search.get("food_status") && !search.get("food_status")!.split(",").includes(event.food_status)) return false;
    if (search.get("meal") && !search.get("meal")!.split(",").includes(inferMeal(event))) return false;
    return true;
  });
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

function calendar(content: string, filename: string): Response {
  return new Response(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Same UI contract as the server endpoints; all decisions and photo samples stay in-browser. */
export async function handleStaticRequest(
  path: string,
  init?: RequestInit,
  suppliedSnapshot?: DemoSnapshot,
): Promise<Response> {
  try {
    const url = new URL(path, "https://demo.invalid");
    const method = init?.method?.toUpperCase() ?? "GET";
    const route = url.pathname;

    if (route === "/api/preferences/parse") {
      if (method === "GET") return json({ agent_ready: false, provider: "local-demo", model: null });
      if (method !== "POST") return json({ error: "Method not supported." }, 405);
      const body = JSON.parse(String(init?.body ?? "{}")) as { utterance?: string; current?: Partial<UserPreference> };
      if (typeof body.utterance !== "string" || !body.utterance.trim() || body.utterance.length > 2000) {
        return json({ error: "Say something the planner can use (up to 2,000 characters)." }, 400);
      }
      const patch = heuristicPreferencePatch(body.utterance.trim());
      const preferences = applyPreferencePatch({ ...DEFAULT_PREFERENCES, ...body.current }, patch, body.utterance.trim());
      return json({ preferences, summary: preferences.preference_summary, source: "heuristic" });
    }

    if (route === "/api/vision") {
      if (method === "GET") return json({ vision_ready: false, provider: "mock", model: null });
      if (method !== "POST") return json({ error: "Method not supported." }, 405);
      const form = init?.body;
      if (!(form instanceof FormData)) return json({ error: "Choose an image to try the demo." }, 400);
      const file = form.get("file");
      if (!(file instanceof Blob) || !file.type.startsWith("image/")) return json({ error: "Only images are allowed." }, 400);
      if (file.size > APP_CONFIG.maxUploadBytes) return json({ error: "Image is too large (max 4 MB)." }, 400);
      const eventId = form.get("eventId");
      const menu = getHiddenMenu(typeof eventId === "string" ? eventId : null);
      const labels = menu ? hiddenMenuLabels(menu) : ["Sample pizza", "Sample cookies"];
      return json({
        labels,
        atlasIds: matchAtlasIds(labels),
        confidence: 0,
        provider: "mock",
        hiddenMenu: menu ? serializeHiddenMenu(menu) : null,
        note: "Demo scan: sample dishes, not image recognition. Your photo stays in this browser and is not uploaded.",
      });
    }

    const data = suppliedSnapshot ?? await loadSnapshot();
    if (route === "/api/events" && method === "GET") {
      const events = filterEvents(data.events, url.searchParams);
      return json({ events, count: events.length });
    }
    if (route === "/api/sources" && method === "GET") {
      return json({ repository: "static-demo", extraction: { provider: "local-fixture", active: false }, grok: { ready: false }, sources: data.sources });
    }
    if (route === "/api/calendar" && method === "GET") {
      const event = data.events.find((item) => item.id === url.searchParams.get("eventId"));
      return event ? calendar(eventToIcs(event), `${event.id}.ics`) : json({ error: "Event not found." }, 404);
    }
    if ((route === "/api/plan" || route === "/api/calendar") && method === "POST") {
      const parsed = PlannerRequestSchema.safeParse(JSON.parse(String(init?.body ?? "{}")));
      if (!parsed.success) return json({ error: "Check your planner date, meals, and walking limit." }, 400);
      const request = { ...parsed.data, allow_expired_registration: parsed.data.allow_expired_registration ?? false };
      const now = frozenDemoNow();
      if (route === "/api/plan" && request.mode === "week") {
        const week = buildWeekPlan(data.events, request, now);
        return json({ week, itinerary: week.days[0]?.itinerary ?? null });
      }
      const itinerary = buildItinerary(data.events, request, now);
      return route === "/api/calendar"
        ? calendar(itineraryToIcs(itinerary), `scottybites-${request.date}.ics`)
        : json({ itinerary });
    }
    return json({ error: "This action needs the full server app and is not available in the static demo." }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not complete the demo action." }, 400);
  }
}
