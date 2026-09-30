import { describe, expect, it } from "vitest";
import locations from "@/data/geo/building-locations.json";
import { BUILDINGS, getBuilding, getBuildingMapLocation } from "@/lib/maps/buildings";
import { clusterEvents, eventLngLat } from "@/lib/maps/cluster-events";
import { campusWalk, outdoorExitsForBuilding } from "@/lib/maps/campus-graph";
import { withEventDefaults } from "@/lib/personalization/event-fields";

const sample = (building_id: string) =>
  withEventDefaults({
    id: `sample-${building_id}`,
    title: "Sample lunch",
    start_time: "2026-09-12T16:00:00.000Z",
    building_id,
  });

describe("source-backed building pins", () => {
  it("uses the recorded OSM footprint anchors for all thirteen campus buildings", () => {
    const campus = BUILDINGS.filter((building) => !building.off_campus);
    expect(campus).toHaveLength(13);
    for (const building of campus) {
      const location = getBuildingMapLocation(building.id)!;
      expect(location).not.toBeNull();
      expect(location.latitude).toBe(building.latitude);
      expect(location.longitude).toBe(building.longitude);
      expect(location.source_url).toMatch(/^https:\/\/www.openstreetmap.org\/way\/\d+$/);
      expect(location.accuracy_note).toContain("not a surveyed point");
    }
  });

  it("places Tepper north of Forbes, not at the old south-campus coordinate", () => {
    const tepper = getBuilding("tepper")!;
    expect(tepper.latitude).toBe(40.4450907);
    expect(tepper.longitude).toBe(-79.9453297);
    expect(tepper.latitude).toBeGreaterThan(getBuilding("hamburg")!.latitude);
    expect(locations.tepper.official_cross_check.source_url).toBe(
      "https://www.cmu.edu/tepper/directions",
    );
    expect(eventLngLat(sample("tepper"))).toEqual({
      lat: tepper.latitude,
      lng: tepper.longitude,
    });
  });

  it("keeps vague Craig Street and unknown venues in the list without invented pins", () => {
    expect(getBuildingMapLocation("craig")).toBeNull();
    expect(getBuildingMapLocation("unknown")).toBeNull();
    expect(getBuildingMapLocation(null)).toBeNull();
    expect(eventLngLat(sample("craig"))).toBeNull();
    expect(clusterEvents([sample("craig"), sample("tepper")])).toHaveLength(1);
  });

  it("does not reuse known-wrong south-campus Tepper entrance geometry", () => {
    expect(outdoorExitsForBuilding("tepper")).toEqual([]);
    expect(campusWalk("ghc", "tepper")).toBeNull();
  });
});
