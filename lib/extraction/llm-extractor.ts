import { hasLlmCredentials, SERVER_CONFIG } from "@/lib/config";
import type { EventExtraction } from "@/lib/extraction/event-schema";
import { parseEventExtractions } from "@/lib/extraction/event-schema";
import type { EventExtractor, ExtractionInput } from "@/lib/extraction/heuristic-extractor";
import { completeOpenAiJson } from "@/lib/llm/chat";

export { parseJsonFromModelText, textFromChatMessage } from "@/lib/llm/chat";

/**
 * OpenAI-compatible chat extractor. Works with OpenAI, IFM K2 Horizon, and
 * other /v1/chat/completions hosts. Invalid model JSON is rejected.
 */
export class LLMEventExtractor implements EventExtractor {
  readonly name = "llm-v1";

  async extract(input: ExtractionInput): Promise<EventExtraction[]> {
    const provider = llmProvider();
    if (!provider) {
      throw new Error(
        "LLMEventExtractor requires credentials. Use the heuristic extractor, or set EXTRACTION_PROVIDER=llm plus an API key.",
      );
    }

    const prompt = buildPrompt(input);
    const raw = await callProvider(provider, prompt);
    const parsed = parseEventExtractions(raw);
    if (!parsed.ok) {
      throw new Error(`LLM extraction failed validation: ${parsed.error}`);
    }
    return parsed.data.map(repairExtraction);
  }
}

type Provider = "openai" | "anthropic" | "gemini";

function llmProvider(): Provider | null {
  if (SERVER_CONFIG.extractionProvider !== "llm") return null;
  if (SERVER_CONFIG.openaiApiKey) return "openai";
  if (SERVER_CONFIG.anthropicApiKey) return "anthropic";
  if (SERVER_CONFIG.geminiApiKey) return "gemini";
  return null;
}

const EXTRACTION_JSON_CONTRACT = [
  "Return ONLY JSON. No markdown. No preamble.",
  "Shape: {\"events\": EventExtraction[]}",
  "Each EventExtraction MUST use these keys exactly:",
  '{"title":"Saturday Lunch","description":"Lunch will be provided.","organizer":"HackCMU","startTime":"2026-09-12T12:00:00-04:00","endTime":"2026-09-12T13:30:00-04:00","venueRaw":"CUC Rangos","room":null,"food":{"status":"EXPLICIT","types":["lunch"],"confidence":0.95,"evidence":"Lunch will be provided."},"registration":{"required":false,"url":null,"deadline":null}}',
  "Rules: never invent food/dates/rooms. Unknown values are null.",
  "food.status is EXPLICIT | LIKELY | POSSIBLE | NONE.",
  "food.types items are breakfast|brunch|lunch|dinner|pizza|snacks|dessert|refreshments|drinks|catering|unknown.",
  "startTime/endTime are ISO 8601 with offset in America/New_York, or null.",
].join("\n");

function buildPrompt(input: ExtractionInput): string {
  return [
    "Extract campus events from the source text.",
    EXTRACTION_JSON_CONTRACT,
    `Source URL: ${input.sourceUrl}`,
    `Page title: ${input.title}`,
    `Timezone: ${input.timezone ?? "America/New_York"}`,
    `Date context: ${input.sourceDateContext ?? "unknown"}`,
    "---",
    input.text,
  ].join("\n");
}

async function callProvider(provider: Provider, prompt: string): Promise<unknown> {
  if (provider === "openai") {
    const raw = await completeOpenAiJson({
      system: EXTRACTION_JSON_CONTRACT,
      user: prompt,
      maxTokens: 8192,
    });
    return unwrapExtractionPayload(raw);
  }

  throw new Error(
    `Provider ${provider} is scaffolded but not implemented without additional SDK work.`,
  );
}

export function unwrapExtractionPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "events" in value) {
    return (value as { events: unknown }).events;
  }
  if (value && typeof value === "object" && "title" in value) {
    return [value];
  }
  return value;
}

function repairExtraction(item: EventExtraction): EventExtraction {
  if (item.food.status === "EXPLICIT" && !item.food.evidence) {
    return {
      ...item,
      food: { ...item.food, status: "POSSIBLE", confidence: Math.min(item.food.confidence, 0.4) },
    };
  }
  return item;
}

export function canUseLlmExtractor(): boolean {
  return SERVER_CONFIG.extractionProvider === "llm" && hasLlmCredentials();
}
