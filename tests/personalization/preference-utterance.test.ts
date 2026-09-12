import { describe, expect, it } from "vitest";
import {
  applyPreferencePatch,
  englishPreferenceSummary,
  heuristicPreferencePatch,
} from "@/lib/personalization/apply-patch";
import { unwrapPreferencePayload } from "@/lib/personalization/parse-utterance";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";
import { applyDemoPersona } from "@/lib/personalization/demo-persona";

describe("preference utterance parser", () => {
  it("extracts the hero vegetarian / pizza / walk / RSVP story", () => {
    const patch = heuristicPreferencePatch(
      "I'm vegetarian, like pizza and Asian food, on campus Monday Wednesday Friday for lunch and dinner, walk at most 12 minutes, and I'm willing to RSVP.",
    );
    expect(patch.dietary_constraints).toEqual(["vegetarian"]);
    expect(patch.favorite_foods).toEqual(expect.arrayContaining(["pizza", "Asian food"]));
    expect(patch.campus_days).toEqual(["monday", "wednesday", "friday"]);
    expect(patch.wants_lunch).toBe(true);
    expect(patch.wants_dinner).toBe(true);
    expect(patch.max_walking_minutes).toBe(12);
    expect(patch.willing_to_rsvp).toBe("yes");
  });

  it("applies the demo persona in one shot including Saturday", () => {
    const next = applyDemoPersona(DEFAULT_PREFERENCES);
    expect(next.dietary_constraints).toEqual(["vegetarian"]);
    expect(next.favorite_foods).toEqual(expect.arrayContaining(["pizza", "Asian food"]));
    expect(next.preferred_cuisines).toContain("Asian");
    expect(next.campus_days).toEqual(["monday", "wednesday", "friday", "saturday"]);
    expect(next.wants_lunch).toBe(true);
    expect(next.wants_snacks).toBe(true);
    expect(next.wants_dinner).toBe(true);
    expect(next.max_walking_minutes).toBe(12);
    expect(next.willing_to_rsvp).toBe("yes");
    expect(next.last_preference_utterance).toContain("vegetarian");
  });

  it("understands Traditional Chinese constraints", () => {
    const patch = heuristicPreferencePatch(
      "我素食，喜歡披薩，週一週三午餐，最多 10 分鐘走路，不願意 RSVP。",
    );
    expect(patch.dietary_constraints).toContain("vegetarian");
    expect(patch.favorite_foods).toContain("pizza");
    expect(patch.campus_days).toEqual(["monday", "wednesday"]);
    expect(patch.max_walking_minutes).toBe(10);
    expect(patch.willing_to_rsvp).toBe("no");
    expect(patch.summary).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it("rewrites a Chinese LLM summary into English", () => {
    const next = applyPreferencePatch(
      DEFAULT_PREFERENCES,
      {
        dietary_constraints: ["vegetarian"],
        favorite_foods: ["pizza"],
        summary: "素食，喜歡披薩。",
      },
      "I am vegetarian and like pizza.",
    );
    expect(next.preference_summary).not.toMatch(/[\u4e00-\u9fff]/);
    expect(englishPreferenceSummary(next, "素食")).toBe(next.preference_summary);
  });

  it("merges only mentioned fields onto existing preferences", () => {
    const current = {
      ...DEFAULT_PREFERENCES,
      dietary_constraints: ["vegan"],
      max_walking_minutes: 20,
    };
    const next = applyPreferencePatch(
      current,
      heuristicPreferencePatch("I like pizza and will walk at most 12 minutes."),
      "I like pizza and will walk at most 12 minutes.",
    );
    expect(next.dietary_constraints).toEqual(["vegan"]);
    expect(next.favorite_foods).toContain("pizza");
    expect(next.max_walking_minutes).toBe(12);
  });

  it("unwraps a one-item LLM array payload", () => {
    expect(
      unwrapPreferencePayload([
        { dietary_constraints: ["vegetarian"], summary: "veg" },
      ]),
    ).toEqual({ dietary_constraints: ["vegetarian"], summary: "veg" });
  });
});
