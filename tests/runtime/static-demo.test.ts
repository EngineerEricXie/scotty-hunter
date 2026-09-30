import { beforeAll, describe, expect, it, vi } from "vitest";
import { handleStaticRequest, type DemoSnapshot } from "@/lib/static-demo";
import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";
import { applyCorpusBoost } from "@/lib/community/boost";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";
import { plannerRequestFromPrefs } from "@/lib/personalization/request";
import { applyDemoPersona } from "@/lib/personalization/demo-persona";
import { calendarDateInZone } from "@/lib/timezone";
import type { Event, Itinerary, WeekPlan } from "@/lib/types";

let data: DemoSnapshot;
const body = plannerRequestFromPrefs(applyDemoPersona(DEFAULT_PREFERENCES), "2026-09-12", "day");
const post = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

beforeAll(async () => {
  const repo = new LocalFixtureEventRepository();
  data = {
    events: applyCorpusBoost(await repo.listEvents({ include_none: true })),
    sources: await repo.listSources(),
  };
});

describe("GitHub Pages local demo", () => {
  it("filters bundled events by date and building without a network call", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await handleStaticRequest("/api/events?date=2026-09-12&building=nsh", undefined, data);
    const { events } = await response.json() as { events: Event[] };
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.building_id === "nsh" && calendarDateInZone(new Date(event.start_time)) === "2026-09-12")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it("builds a repeatable, non-empty day plan and a week plan", async () => {
    const one = await (await handleStaticRequest("/api/plan", post(body), data)).json() as { itinerary: Itinerary };
    const two = await (await handleStaticRequest("/api/plan", post(body), data)).json() as { itinerary: Itinerary };
    expect(one.itinerary.events.length).toBeGreaterThan(0);
    expect(one.itinerary.events.map((event) => event.id)).toEqual(two.itinerary.events.map((event) => event.id));
    const { week } = await (await handleStaticRequest("/api/plan", post({ ...body, mode: "week" }), data)).json() as { week: WeekPlan };
    expect(week.days.length).toBeGreaterThan(0);
    expect(week.days.flatMap((day) => day.itinerary.events).length).toBeGreaterThan(0);
  });

  it("rejects invalid planner inputs", async () => {
    expect((await handleStaticRequest("/api/plan", post({ ...body, max_walking_minutes: -1 }), data)).status).toBe(400);
  });

  it("parses preferences locally", async () => {
    const result = await (await handleStaticRequest("/api/preferences/parse", post({ utterance: "I am vegetarian. I like pizza and can walk 12 minutes.", current: DEFAULT_PREFERENCES }), data)).json();
    expect(result.source).toBe("heuristic");
    expect(result.preferences.dietary_constraints).toContain("vegetarian");
    expect(result.preferences.max_walking_minutes).toBe(12);
  });

  it("exports an event and the day as valid calendar content", async () => {
    const event = data.events.find((item) => item.id === "demo-ri-pizza")!;
    const one = await handleStaticRequest(`/api/calendar?eventId=${event.id}`, undefined, data);
    expect(one.headers.get("content-type")).toContain("text/calendar");
    expect(await one.text()).toContain(`UID:${event.id}@scottybites.local`);
    const day = await handleStaticRequest("/api/calendar", post(body), data);
    const text = await day.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain("END:VCALENDAR");
  });

  it("keeps demo photos local and clearly identifies sample results", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const form = new FormData();
    form.append("file", new Blob(["test image"], { type: "image/png" }), "photo.png");
    form.append("eventId", "demo-ri-pizza");
    const result = await (await handleStaticRequest("/api/vision", { method: "POST", body: form }, data)).json();
    expect(result.provider).toBe("mock");
    expect(result.confidence).toBe(0);
    expect(result.hiddenMenu.eventId).toBe("demo-ri-pizza");
    expect(result.note).toContain("not image recognition");
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it("rejects non-image demo uploads", async () => {
    const form = new FormData();
    form.append("file", new Blob(["text"], { type: "text/plain" }), "file.txt");
    expect((await handleStaticRequest("/api/vision", { method: "POST", body: form }, data)).status).toBe(400);
  });
});
