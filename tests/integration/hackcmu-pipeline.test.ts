import { describe, expect, it } from "vitest";
import { extractEventsFromText } from "@/lib/extraction/extract-events";
import { HACKCMU_FIXTURE_TEXT } from "@/data/fixtures/hackcmu-2026/source";
import { buildItinerary } from "@/lib/planner/build-itinerary";
import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";

describe("HackCMU fixture pipeline", () => {
  it("extracts structured HackCMU food events from fixture text", async () => {
    const events = await extractEventsFromText(
      {
        sourceUrl: "fixture://hackcmu-2026/opening-ceremony.txt",
        title: "HackCMU 2026 Opening Ceremony",
        text: HACKCMU_FIXTURE_TEXT,
        sourceDateContext: "2026-09-11",
      },
      {
        sourceId: "hackcmu-2026-fixture",
        sourceType: "pdf",
        provenanceNote: "test",
      },
    );

    const titles = events.map((event) => event.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Dinner + Sponsor Expo",
        "Midnight Cafe",
        "Saturday Lunch",
        "Saturday Dinner",
        "IFM Workshop",
        "Cursor Workshop",
      ]),
    );

    const dinner = events.find((event) => event.title === "Dinner + Sponsor Expo");
    expect(dinner?.food_status).toBe("EXPLICIT");
    expect(dinner?.food_evidence).toMatch(/Dinner will be served/i);
    expect(dinner?.building_id).toBe("cuc");

    const ifm = events.find((event) => event.title === "IFM Workshop");
    expect(ifm?.food_status).toBe("NONE");
    expect(ifm?.registration_required).toBe(true);
    expect(ifm?.building_id).toBe("ghc");
    expect(ifm?.room).toBe("4307");

    const midnight = events.find((event) => event.title === "Midnight Cafe");
    expect(midnight?.food_status).toBe("EXPLICIT");
    expect(midnight?.building_id).toBe("wean");
  });

  it("turns repository events into planner candidates", async () => {
    const repo = new LocalFixtureEventRepository();
    const events = await repo.listEvents({ date: "2026-09-12", include_none: false });
    const plan = buildItinerary(events, {
      date: "2026-09-12",
      meals: ["lunch", "dinner"],
      max_walking_minutes: 15,
      start_building_id: "ghc",
      include_likely: true,
      explicit_only: false,
      allow_expired_registration: false,
    });
    expect(plan.event_count).toBeGreaterThanOrEqual(2);
    expect(plan.events.some((event) => event.food_status !== "NONE")).toBe(true);
    const eventLegs = plan.items.filter((item) => item.kind === "event");
    expect(eventLegs.every((item) => (item.positive_reasons?.length ?? 0) > 0)).toBe(true);
  });
});
