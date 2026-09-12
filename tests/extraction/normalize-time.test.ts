import { parseClockTime, parseTimeRangeText } from "@/lib/extraction/normalize-time";
import { describe, expect, it } from "vitest";

describe("time normalization", () => {
  it("parses noon", () => {
    expect(parseClockTime("noon")).toEqual({ hour: 12, minute: 0 });
    const parsed = parseTimeRangeText("noon", { defaultDate: "2026-09-12" });
    expect(parsed.startIso).toBeTruthy();
    expect(new Date(parsed.startIso!).toISOString()).toContain("2026-09-12T16:00:00");
  });

  it("parses midnight", () => {
    expect(parseClockTime("midnight")).toEqual({ hour: 0, minute: 0 });
    const parsed = parseTimeRangeText("midnight", { defaultDate: "2026-09-12" });
    expect(parsed.startIso).toBeTruthy();
    expect(new Date(parsed.startIso!).toISOString()).toContain("2026-09-12T04:00:00");
  });

  it("parses AM/PM", () => {
    expect(parseClockTime("5:30 PM")).toEqual({ hour: 17, minute: 30 });
    expect(parseClockTime("9:00 am")).toEqual({ hour: 9, minute: 0 });
    expect(parseClockTime("12:00 AM")).toEqual({ hour: 0, minute: 0 });
    expect(parseClockTime("12:00 PM")).toEqual({ hour: 12, minute: 0 });
  });

  it("handles cross-midnight ranges", () => {
    const parsed = parseTimeRangeText("11:00 PM – 1:00 AM", {
      defaultDate: "2026-09-11",
    });
    expect(parsed.startIso).toBeTruthy();
    expect(parsed.endIso).toBeTruthy();
    expect(new Date(parsed.endIso!).getTime()).toBeGreaterThan(
      new Date(parsed.startIso!).getTime(),
    );
  });

  it("inherits a date heading context", () => {
    const parsed = parseTimeRangeText("5:30 PM – 7:00 PM", {
      defaultDate: "2026-09-11",
    });
    expect(parsed.startIso).toContain("2026-09-11T21:30:00");
  });

  it("does not invent a missing date", () => {
    const parsed = parseTimeRangeText("5:30 PM – 7:00 PM");
    expect(parsed.startIso).toBeNull();
    expect(parsed.incompleteReasons).toContain("missing_date");
  });
});
