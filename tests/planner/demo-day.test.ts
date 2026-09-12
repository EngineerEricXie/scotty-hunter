import { describe, expect, it } from "vitest";
import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";
import { frozenDemoNow } from "@/lib/demo-clock";
import { applyDemoPersona } from "@/lib/personalization/demo-persona";
import { plannerRequestFromPrefs } from "@/lib/personalization/request";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";

describe("demo Saturday itinerary", () => {
  it("lists lunch, 4 PM cookies, then dinner in clock order", async () => {
    const repo = new LocalFixtureEventRepository();
    const events = await repo.listEvents({ date: "2026-09-12", include_none: false });
    const prefs = applyDemoPersona(DEFAULT_PREFERENCES);
    const request = plannerRequestFromPrefs(prefs, "2026-09-12", "day");
    const plan = buildItinerary(events, request, frozenDemoNow());
    expect(plan.events.map((event) => event.id)).toEqual([
      "demo-ri-pizza",
      "demo-cookie-hour",
      "hackcmu-2026-saturday-dinner",
    ]);
    const starts = plan.events.map((event) => event.start_time);
    expect(starts).toEqual([...starts].sort((a, b) => a.localeCompare(b)));
  });
});
