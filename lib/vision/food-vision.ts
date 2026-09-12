import { hasGrokCredentials } from "@/lib/config";
import { completeGrokVisionJson } from "@/lib/llm/chat";
import { matchAtlasIds } from "@/lib/scotty/atlas";
import {
  getHiddenMenu,
  hiddenMenuLabels,
  serializeHiddenMenu,
  type HiddenMenu,
} from "@/lib/vision/hidden-menu";

export interface FoodVisionResult {
  labels: string[];
  atlasIds: string[];
  confidence: number;
  provider: "mock" | "grok";
  hiddenMenu: ReturnType<typeof serializeHiddenMenu> | null;
}

export interface FoodVisionInput {
  fileName: string;
  byteLength: number;
  mime: string;
  eventId?: string | null;
  imageDataUrl?: string | null;
}

export interface FoodVisionService {
  readonly name: string;
  analyze(input: FoodVisionInput): Promise<FoodVisionResult>;
}

const VISION_SYSTEM = [
  "You identify campus free-food table photos for Carnegie Mellon students.",
  "Reply with a single JSON object only. First character must be '{'.",
  '{"labels":["Cheese pizza","Mixed greens"],"confidence":0.86,"food_table":true}',
  "labels: 1-8 short English dish names actually visible. Empty array if no food.",
  "confidence: number from 0 to 1.",
  "food_table: true if this is a serving table, catering trays, buffet, or plated campus food.",
  "Do not invent dishes that are not visible.",
].join("\n");

function labelsFromFileName(fileName: string, mime: string): { labels: string[]; confidence: number } {
  const lower = fileName.toLowerCase();
  if (lower.includes("pizza") || lower.includes("pepperoni") || lower.includes("hackcmu")) {
    return { labels: ["Pepperoni pizza", "Salad", "HackCMU catering"], confidence: 0.86 };
  }
  if (lower.includes("bagel") || lower.includes("breakfast")) {
    return { labels: ["Bagels", "Coffee"], confidence: 0.78 };
  }
  if (lower.includes("cookie") || lower.includes("midnight")) {
    return { labels: ["Cookies", "Midnight snacks"], confidence: 0.81 };
  }
  if (mime.startsWith("image/")) {
    return { labels: ["Campus catering tray", "Cookies"], confidence: 0.64 };
  }
  return { labels: ["Unknown dish"], confidence: 0.2 };
}

export function resolveVisionLabels(input: FoodVisionInput): {
  labels: string[];
  confidence: number;
  menu: HiddenMenu | null;
} {
  const menu = getHiddenMenu(input.eventId);
  if (menu) {
    return {
      labels: hiddenMenuLabels(menu),
      confidence: 0.91,
      menu,
    };
  }
  const guessed = labelsFromFileName(input.fileName, input.mime);
  return { ...guessed, menu: null };
}

export function parseVisionPayload(raw: unknown): {
  labels: string[];
  confidence: number;
  foodTable: boolean;
} {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const labels = Array.isArray(obj.labels)
    ? obj.labels
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const confidence =
    typeof obj.confidence === "number" && Number.isFinite(obj.confidence)
      ? Math.min(1, Math.max(0, obj.confidence))
      : 0.5;
  const foodTable = obj.food_table === true || obj.foodTable === true;
  return { labels, confidence, foodTable };
}

export function revealHiddenMenuFromVision(
  eventId: string | null | undefined,
  labels: string[],
  foodTable: boolean,
): HiddenMenu | null {
  const menu = getHiddenMenu(eventId);
  if (!menu) return null;
  if (foodTable) return menu;
  const hay = labels.join(" ").toLowerCase();
  const overlap = menu.dishes.some((dish) => {
    const name = dish.name.toLowerCase();
    return hay.includes(name) || labels.some((label) => {
      const lower = label.toLowerCase();
      return name.includes(lower) || lower.includes(name);
    });
  });
  return overlap ? menu : null;
}

export class MockFoodVisionService implements FoodVisionService {
  readonly name = "mock";

  async analyze(input: FoodVisionInput): Promise<FoodVisionResult> {
    const resolved = resolveVisionLabels(input);
    return {
      labels: resolved.labels,
      atlasIds: matchAtlasIds(resolved.labels),
      confidence: resolved.confidence,
      provider: "mock",
      hiddenMenu: resolved.menu ? serializeHiddenMenu(resolved.menu) : null,
    };
  }
}

export class GrokFoodVisionService implements FoodVisionService {
  readonly name = "grok";

  async analyze(input: FoodVisionInput): Promise<FoodVisionResult> {
    if (!input.imageDataUrl) {
      throw new Error("Photo bytes are required for Grok vision.");
    }
    const raw = await completeGrokVisionJson({
      system: VISION_SYSTEM,
      user: [
        `File name: ${input.fileName}`,
        `Event id: ${input.eventId ?? "none"}`,
        "Identify visible food. Output one JSON object now.",
      ].join("\n"),
      imageDataUrl: input.imageDataUrl,
    });
    const parsed = parseVisionPayload(raw);
    const menu = revealHiddenMenuFromVision(input.eventId, parsed.labels, parsed.foodTable);
    const labels = parsed.labels.length > 0 ? parsed.labels : menu ? hiddenMenuLabels(menu) : [];
    return {
      labels,
      atlasIds: matchAtlasIds(labels),
      confidence: parsed.confidence,
      provider: "grok",
      hiddenMenu: menu ? serializeHiddenMenu(menu) : null,
    };
  }
}

/** @deprecated Use GrokFoodVisionService. */
export class RealVisionService extends GrokFoodVisionService {}

export function getFoodVisionService(): FoodVisionService {
  return hasGrokCredentials() ? new GrokFoodVisionService() : new MockFoodVisionService();
}
