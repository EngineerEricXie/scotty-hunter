import { describe, expect, it } from "vitest";
import { campusOutdoorWalk, campusWalk, campusWalkHint } from "@/lib/maps/campus-graph";
import { walkingMinutesBetween } from "@/lib/planner/walking-time";

describe("campus connector graph", () => {
  it("uses the GHC–NSH indoor bridge", () => {
    const walk = campusWalk("ghc", "nsh");
    expect(walk?.path).toEqual(["ghc", "nsh"]);
    expect(walk?.hops[0]?.kind).toBe("indoor");
    expect(walk?.hops[0]?.geometry.length).toBeGreaterThan(0);
    expect(walkingMinutesBetween("ghc", "nsh")).toBe(2);
  });

  it("exits Doherty on the east plaza door and crosses The Cut lawn to CUC, skipping Hunt", () => {
    const walk = campusWalk("nsh", "cuc");
    expect(walk?.path).toEqual(["nsh", "wean", "doherty", "cuc"]);
    expect(campusWalk("ghc", "cuc")?.path).toEqual(["ghc", "nsh", "wean", "doherty", "cuc"]);
    expect(walk?.path).not.toContain("hunt");
    expect(walk?.hops.map((hop) => `${hop.from}->${hop.to}`)).toEqual([
      "nsh->wean",
      "wean->doherty",
      "doherty->doherty:mall",
      "doherty:mall->cuc:west",
      "cuc:west->cuc",
    ]);
    const mall = walk?.hops.find((hop) => hop.to === "doherty:mall")?.geometry.at(-1);
    expect(mall).toEqual([-79.94416, 40.44228]);
    const outdoor = walk?.hops.find((hop) => hop.kind === "outdoor");
    expect(outdoor?.from).toBe("doherty:mall");
    expect(outdoor?.geometry[0]?.[1]).toBeLessThan(40.4424);
    const cutLats = walk?.hops.flatMap((hop) => hop.geometry.map(([, lat]) => lat)) ?? [];
    expect(Math.min(...cutLats)).toBeGreaterThan(40.442);
    expect(walkingMinutesBetween("nsh", "cuc")).toBe(8);
    expect(campusWalkHint("nsh", "cuc")).toBe("via indoor bridges, then The Cut");
    expect(walkingMinutesBetween("ghc", "nsh") + walkingMinutesBetween("nsh", "cuc")).toBeLessThanOrEqual(
      12,
    );
  });

  it("walks Scott–ANSYS–Porter–Baker on the west-campus connectors", () => {
    expect(campusWalk("scott", "baker")?.path).toEqual(["scott", "ansys", "baker"]);
    expect(campusWalk("scott", "baker")?.hops.some((hop) => hop.kind === "outdoor")).toBe(true);
  });

  it("falls back off-graph for Craig Street", () => {
    expect(campusWalk("ghc", "craig")).toBeNull();
    expect(walkingMinutesBetween("ghc", "craig")).toBeGreaterThan(10);
  });

  it("keeps Scotty on outdoor doors, never indoor bridges", () => {
    const walk = campusOutdoorWalk("doherty", "cuc");
    expect(walk?.path).toEqual(["doherty:mall", "cuc:west"]);
    expect(walk?.hops.every((hop) => hop.kind === "outdoor")).toBe(true);
    expect(campusOutdoorWalk("ghc", "nsh")?.path).toEqual(["ghc:plaza", "hamburg:south", "nsh:north"]);
    expect(campusOutdoorWalk("nsh", "cuc")?.hops.every((hop) => hop.kind === "outdoor")).toBe(true);
    expect(campusOutdoorWalk("nsh", "cuc")?.path[0]).toBe("nsh:north");
    expect(campusOutdoorWalk("nsh", "cuc")?.path.at(-1)).toBe("cuc:west");
  });
});
