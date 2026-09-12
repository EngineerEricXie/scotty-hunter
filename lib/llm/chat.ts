import { SERVER_CONFIG } from "@/lib/config";

interface ChatMessage {
  role?: string;
  content?: unknown;
  reasoning_content?: unknown;
  reasoning?: unknown;
}

export function hasOpenAiCompatibleCredentials(): boolean {
  return Boolean(SERVER_CONFIG.openaiApiKey);
}

function chatCompletionsUrl(): string {
  return `${SERVER_CONFIG.openaiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function usesOfficialOpenAI(): boolean {
  try {
    return new URL(chatCompletionsUrl()).hostname === "api.openai.com";
  } catch {
    return false;
  }
}

export function textFromChatMessage(message: ChatMessage | undefined): string {
  if (!message) return "";
  return [message.content, message.reasoning_content, message.reasoning]
    .map(coerceText)
    .filter(Boolean)
    .join("\n");
}

function coerceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("LLM returned empty content");

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) =>
    match[1].trim(),
  );
  const parsed: unknown[] = [];
  for (const candidate of [...fenced, trimmed]) {
    try {
      parsed.push(JSON.parse(candidate));
    } catch {
      parsed.push(...extractJsonValues(candidate));
    }
  }
  const chosen = pickPreferredJson(parsed);
  if (chosen === undefined) throw new Error("LLM returned non-JSON content");
  return chosen;
}

/** Objects, or arrays of objects — not `["vegetarian"]` fragments from chain-of-thought. */
export function isStructuredJson(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item !== null && typeof item === "object");
  }
  return Boolean(value) && typeof value === "object";
}

function pickPreferredJson(values: unknown[]): unknown | undefined {
  const unique = values.filter((value, index) => {
    const key = JSON.stringify(value);
    return values.findIndex((other) => JSON.stringify(other) === key) === index;
  });
  const objects = unique.filter(
    (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value),
  );
  if (objects.length) {
    return [...objects].sort(
      (a, b) => Object.keys(b as object).length - Object.keys(a as object).length,
    )[0];
  }
  const arrays = unique.filter(Array.isArray);
  return arrays[0] ?? unique[0];
}

/** Complete `{...}` / `[...]` values, ignoring braces inside strings. */
export function extractJsonValues(text: string): unknown[] {
  const found: unknown[] = [];
  for (let i = 0; i < text.length; i++) {
    const start = text[i];
    if (start !== "{" && start !== "[") continue;
    const closer = start === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === start) depth += 1;
      else if (ch === closer) depth -= 1;
      if (depth === 0) {
        const slice = text.slice(i, j + 1);
        try {
          found.push(JSON.parse(slice));
        } catch {
          break;
        }
        i = j;
        break;
      }
    }
  }
  return found;
}

export function extractFirstJsonValue(text: string): string | null {
  const chosen = pickPreferredJson(extractJsonValues(text));
  return chosen === undefined ? null : JSON.stringify(chosen);
}

/**
 * OpenAI-compatible /v1/chat/completions. Works with IFM K2 Horizon.
 * Does not require EXTRACTION_PROVIDER=llm — any configured OPENAI_API_KEY is enough.
 */
export async function completeOpenAiJson(input: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
}): Promise<unknown> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: input.system },
    { role: "user", content: input.user },
  ];

  const first = await postChat(messages, input);
  try {
    return structuredJsonFromMessage(first);
  } catch (firstError) {
    const draft = textFromChatMessage(first).replace(/\s+/g, " ").slice(0, 2500);
    messages.push({
      role: "assistant",
      content: draft || "I analyzed the request but did not emit JSON.",
    });
    messages.push({
      role: "user",
      content:
        'Stop reasoning. Reply with a single JSON object only. First character must be "{". No markdown. No analysis.',
    });
    try {
      const second = await postChat(messages, {
        ...input,
        maxTokens: Math.min(input.maxTokens ?? 2048, 2048),
        reasoningEffort: "low",
      });
      return structuredJsonFromMessage(second);
    } catch (secondError) {
      const preview = draft.slice(0, 220);
      const err = secondError instanceof Error ? secondError : firstError;
      throw new Error(
        err instanceof Error
          ? `${err.message}${preview ? ` · ${preview}` : ""}`
          : "LLM returned non-JSON content",
      );
    }
  }
}

function structuredJsonFromMessage(message: ChatMessage | undefined): unknown {
  const parsed = jsonFromMessage(message);
  if (!isStructuredJson(parsed)) {
    throw new Error("LLM returned a primitive JSON value");
  }
  return parsed;
}

function jsonFromMessage(message: ChatMessage | undefined): unknown {
  const content = coerceText(message?.content);
  const reasoning = [coerceText(message?.reasoning_content), coerceText(message?.reasoning)]
    .filter(Boolean)
    .join("\n");
  const attempts = [
    { text: content },
    { text: reasoning },
    { text: textFromChatMessage(message) },
  ].filter((attempt) => attempt.text);
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return parseJsonFromModelText(attempt.text);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM returned non-JSON content");
}

async function postChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  input: {
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: "low" | "medium" | "high";
  },
): Promise<ChatMessage | undefined> {
  if (!SERVER_CONFIG.openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const reasoningEffort = input.reasoningEffort ?? "low";
  const body: Record<string, unknown> = {
    model: SERVER_CONFIG.openaiModel,
    temperature: input.temperature ?? 0,
    max_tokens: input.maxTokens ?? 8192,
    messages,
  };
  if (usesOfficialOpenAI()) {
    body.response_format = { type: "json_object" };
  } else {
    body.chat_template_kwargs = { reasoning_effort: reasoningEffort };
    body.extra_body = { chat_template_kwargs: { reasoning_effort: reasoningEffort } };
  }

  const res = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVER_CONFIG.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const errorText = await res.text();
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${errorText.slice(0, 300)}`);
  }
  const json = JSON.parse(errorText) as {
    choices?: { message?: ChatMessage }[];
  };
  return json.choices?.[0]?.message;
}
