import { classifyFood } from "@/lib/extraction/classify-food";
import { describe, expect, it } from "vitest";

describe("food classification", () => {
  it("classifies explicit lunch", () => {
    const result = classifyFood("Lunch will be provided.");
    expect(result.status).toBe("EXPLICIT");
    expect(result.evidence).toMatch(/Lunch will be provided/i);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("classifies free pizza as explicit", () => {
    const result = classifyFood("Free pizza after the talk.");
    expect(result.status).toBe("EXPLICIT");
    expect(result.types).toContain("pizza");
  });

  it("classifies refreshments as likely", () => {
    const result = classifyFood("Refreshments will be served.");
    expect(result.status).toBe("LIKELY");
  });

  it("classifies reception follows as likely", () => {
    const result = classifyFood("Reception follows.");
    expect(result.status).toBe("LIKELY");
  });

  it("classifies networking as possible", () => {
    const result = classifyFood("Networking event.");
    expect(result.status).toBe("POSSIBLE");
  });

  it("handles negation", () => {
    const result = classifyFood("No food will be provided.");
    expect(result.status).toBe("NONE");
    expect(result.confidence).toBe(0);
  });

  it("does not mark explicit without evidence", () => {
    const result = classifyFood("Weekly staff meeting in GHC 4307.");
    expect(result.status).toBe("NONE");
    expect(result.evidence).toBeNull();
  });
});
