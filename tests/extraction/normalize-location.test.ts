import { normalizeLocation } from "@/lib/extraction/normalize-location";
import { describe, expect, it } from "vitest";

describe("location normalization", () => {
  it("resolves GHC 4307", () => {
    const result = normalizeLocation("GHC 4307");
    expect(result.building_id).toBe("ghc");
    expect(result.room).toBe("4307");
    expect(result.floor).toBe("4");
  });

  it("resolves Gates 4307", () => {
    const result = normalizeLocation("Gates 4307");
    expect(result.building_id).toBe("ghc");
    expect(result.room).toBe("4307");
  });

  it("resolves Tepper", () => {
    const result = normalizeLocation("Tepper Simmons Auditorium");
    expect(result.building_id).toBe("tepper");
  });

  it("resolves CUC Rangos", () => {
    const result = normalizeLocation("CUC Rangos");
    expect(result.building_id).toBe("cuc");
    expect(result.room?.toLowerCase()).toContain("rangos");
  });

  it("leaves unknown buildings unresolved", () => {
    const result = normalizeLocation("Mysterious Hall 12");
    expect(result.building_id).toBeNull();
    expect(result.resolution_confidence).toBe(0);
  });
});
