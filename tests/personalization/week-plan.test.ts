import { describe, expect, it } from "vitest";
import { DEMO_SEEDED_EVENTS } from "@/data/fixtures/demo-events";
import { demoNow } from "@/lib/demo-clock";
import { upcomingCampusDates } from "@/lib/personalization/week";
import { buildWeekPlan } from "@/lib/planner/build-week";
import type { PlannerRequest } from "@/lib/types";

const hero: PlannerRequest = {
  date: "2026-09-12",
  meals: ["lunch", "dinner"],
  max_walking_minutes: 12,
  start_building_id: "ghc",
  include_likely: true,
  explicit_only: false,
  allow_expired_registration: false,
  dietary_constraints: ["vegetarian"],
  favorite_foods: ["pizza", "Asian food"],
  preferred_cuisines: ["Asian"],
  willing_to_rsvp: "yes",
  campus_days: ["monday", "wednesday", "friday"],
  mode: "week",
};

describe("weekly planner", () => {
  it("plans Monday, Wednesday, and Friday from the demo Saturday", () => {
    expect(upcomingCampusDates("2026-09-12", hero.campus_days)).toEqual([
      "2026-09-14",
      "2026-09-16",
      "2026-09-18",
    ]);

    const week = buildWeekPlan(DEMO_SEEDED_EVENTS, hero, demoNow());
    expect(week.days.map((day) => day.date)).toEqual([
      "2026-09-14",
      "2026-09-16",
      "2026-09-18",
    ]);

    const wednesday = week.days.find((day) => day.date === "2026-09-16");
    expect(wednesday?.itinerary.events.map((event) => event.id)).toContain("demo-wed-veg-pizza");
    expect(wednesday?.itinerary.events.map((event) => event.id)).not.toContain("demo-wed-steak");
    expect(wednesday?.itinerary.events.map((event) => event.id)).toContain("demo-wed-asian-mixer");

    const friday = week.days.find((day) => day.date === "2026-09-18");
    expect(friday?.itinerary.events.map((event) => event.id)).toContain("demo-fri-google-dinner");

    const eventLegs = week.days.flatMap((day) =>
      day.itinerary.items.filter((item) => item.kind === "event"),
    );
    expect(eventLegs.length).toBeGreaterThan(0);
    for (const leg of eventLegs) {
      expect(leg.positive_reasons?.length).toBeGreaterThan(0);
    }

    expect(week.required_actions.some((action) => action.when === "tomorrow")).toBe(true);
    expect(week.required_actions.some((action) => /Google AI Talk dinner/i.test(action.title))).toBe(
      true,
    );
  });
});
