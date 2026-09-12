import { describe, expect, it } from "vitest";
import { getHiddenMenu, hasHiddenMenu, hiddenMenuDietaryTags } from "@/lib/vision/hidden-menu";
import {
  parseVisionPayload,
  resolveVisionLabels,
  revealHiddenMenuFromVision,
} from "@/lib/vision/food-vision";
import { matchAtlasIds } from "@/lib/scotty/atlas";

describe("hidden menus", () => {
  it("gives Saturday lunch a locked catalog the public listing omitted", () => {
    const menu = getHiddenMenu("hackcmu-2026-saturday-lunch");
    expect(menu).toBeTruthy();
    expect(menu?.publicListing).toBe("Lunch will be provided.");
    expect(menu?.dishes.map((dish) => dish.name)).toEqual(
      expect.arrayContaining(["Vegetarian pizza", "Pepperoni pizza", "Cut fruit"]),
    );
    expect(hiddenMenuDietaryTags(menu!)).toEqual(
      expect.arrayContaining(["vegetarian", "vegan", "gluten-free"]),
    );
  });

  it("does not invent a hidden menu for no-food events", () => {
    expect(hasHiddenMenu("demo-faculty-council")).toBe(false);
    expect(getHiddenMenu("demo-faculty-council")).toBeNull();
  });

  it("vision labels for Saturday lunch come from the hidden menu, not the filename", () => {
    const resolved = resolveVisionLabels({
      fileName: "IMG_4401.jpg",
      byteLength: 120_000,
      mime: "image/jpeg",
      eventId: "hackcmu-2026-saturday-lunch",
    });
    expect(resolved.menu?.eventId).toBe("hackcmu-2026-saturday-lunch");
    expect(resolved.labels).toContain("Vegetarian pizza");
    expect(resolved.labels).not.toContain("Unknown dish");
    expect(matchAtlasIds(resolved.labels)).toEqual(expect.arrayContaining(["pizza", "hidden"]));
  });

  it("falls back to filename labels when the event has no hidden menu", () => {
    const resolved = resolveVisionLabels({
      fileName: "bagel-table.png",
      byteLength: 80_000,
      mime: "image/png",
      eventId: "demo-faculty-council",
    });
    expect(resolved.menu).toBeNull();
    expect(resolved.labels).toEqual(["Bagels", "Coffee"]);
  });
});

describe("Grok vision payload", () => {
  it("reads labels, confidence, and food_table", () => {
    expect(
      parseVisionPayload({
        labels: ["Cheese pizza", "  ", "Mixed greens"],
        confidence: 0.88,
        food_table: true,
      }),
    ).toEqual({
      labels: ["Cheese pizza", "Mixed greens"],
      confidence: 0.88,
      foodTable: true,
    });
  });

  it("unlocks a hidden menu when Grok sees a food table", () => {
    const menu = revealHiddenMenuFromVision("hackcmu-2026-saturday-lunch", ["pizza"], true);
    expect(menu?.eventId).toBe("hackcmu-2026-saturday-lunch");
  });

  it("does not unlock a hidden menu from event id alone", () => {
    expect(revealHiddenMenuFromVision("hackcmu-2026-saturday-lunch", ["hallway"], false)).toBeNull();
  });
});
