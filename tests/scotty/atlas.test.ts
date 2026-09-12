import { describe, expect, it } from "vitest";
import { matchAtlasIds } from "@/lib/scotty/atlas";

describe("food atlas matching", () => {
  it("maps pizza labels to the pizza species", () => {
    expect(matchAtlasIds(["Pepperoni pizza", "Salad"])).toEqual(
      expect.arrayContaining(["pizza", "salad"]),
    );
  });

  it("falls back to mystery for unlabeled dishes", () => {
    expect(matchAtlasIds(["Strange stew"])).toEqual(["mystery"]);
  });
});
