import { describe, expect, it } from "vitest";
import { parseEventExtractions } from "@/lib/extraction/event-schema";

describe("AI extraction schema", () => {
  it("rejects malformed output", () => {
    const parsed = parseEventExtractions([{ title: 1 }]);
    expect(parsed.ok).toBe(false);
  });

  it("accepts null unknowns", () => {
    const parsed = parseEventExtractions([
      {
        title: "Talk",
        description: null,
        organizer: null,
        startTime: null,
        endTime: null,
        venueRaw: null,
        room: null,
        food: { status: "NONE", types: [], confidence: 0, evidence: null },
        registration: { required: null, url: null, deadline: null },
      },
    ]);
    expect(parsed.ok).toBe(true);
  });
});
