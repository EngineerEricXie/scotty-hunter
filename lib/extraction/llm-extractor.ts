import { hasLlmCredentials, SERVER_CONFIG } from "@/lib/config";
import type { EventExtraction } from "@/lib/extraction/event-schema";
import { parseEventExtractions } from "@/lib/extraction/event-schema";
import type { EventExtractor, ExtractionInput } from "@/lib/extraction/heuristic-extractor";

/**
 * Scaffolded LLM adapter. Does not make network calls unless credentials
 * exist AND EXTRACTION_PROVIDER=llm. Invalid model JSON is rejected.
 *
 * Manual step remaining: provide an API key and set EXTRACTION_PROVIDER=llm.
 */
export class LLMEventExtractor implements EventExtractor {
  readonly name = "llm-v1-scaffold";

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

function buildPrompt(input: ExtractionInput): string {
  return [
    "Extract campus events from the source text.",
    "Never invent food, dates, rooms, or registration details.",
    "If unknown, use null. Copy a short food evidence phrase when food is claimed.",
    `Source URL: ${input.sourceUrl}`,
    `Page title: ${input.title}`,
    `Timezone: ${input.timezone ?? "America/New_York"}`,
    `Date context: ${input.sourceDateContext ?? "unknown"}`,
    "Return JSON array matching EventExtractionSchema.",
    "---",
    input.text,
  ].join("\n");
}

async function callProvider(provider: Provider, prompt: string): Promise<unknown> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVER_CONFIG.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return JSON of the form {\"events\": EventExtraction[]}. Never invent facts.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    const parsed = JSON.parse(content) as { events?: unknown };
    return parsed.events ?? parsed;
  }

  throw new Error(
    `Provider ${provider} is scaffolded but not implemented without additional SDK work.`,
  );
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
