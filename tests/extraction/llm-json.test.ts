import { describe, expect, it } from "vitest";
import {
  parseJsonFromModelText,
  textFromChatMessage,
  unwrapExtractionPayload,
} from "@/lib/extraction/llm-extractor";

describe("LLM JSON recovery", () => {
  it("unwraps {events: []} payloads", () => {
    const raw = unwrapExtractionPayload({
      events: [{ title: "Lunch" }],
    });
    expect(raw).toEqual([{ title: "Lunch" }]);
  });

  it("wraps a lone event object", () => {
    expect(unwrapExtractionPayload({ title: "Talk" })).toEqual([{ title: "Talk" }]);
  });

  it("parses fenced JSON after reasoning text", () => {
    const text = [
      "thinking about the schedule...",
      "```json",
      '{"events":[{"title":"Saturday Lunch"}]}',
      "```",
    ].join("\n");
    expect(parseJsonFromModelText(text)).toEqual({
      events: [{ title: "Saturday Lunch" }],
    });
  });

  it("slices JSON from mixed model output", () => {
    const parsed = parseJsonFromModelText(
      'Sure. {"events":[{"title":"Midnight Cafe"}]} thanks',
    );
    expect(parsed).toEqual({ events: [{ title: "Midnight Cafe" }] });
  });

  it("skips incomplete braces in thinking and takes the finished object", () => {
    const parsed = parseJsonFromModelText(
      'Need to update dietary_constraints to ["vegetarian"]. Then emit {"dietary_constraints":["vegetarian"],"summary":"veg"}.',
    );
    expect(parsed).toEqual({
      dietary_constraints: ["vegetarian"],
      summary: "veg",
    });
  });

  it("reads reasoning_content when content is empty", () => {
    const text = textFromChatMessage({
      content: "",
      reasoning_content: '{"events":[]}',
    });
    expect(parseJsonFromModelText(text)).toEqual({ events: [] });
  });
});
