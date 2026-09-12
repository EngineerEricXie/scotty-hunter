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
  provider: "mock" | "real";
  hiddenMenu: ReturnType<typeof serializeHiddenMenu> | null;
}

export interface FoodVisionInput {
  fileName: string;
  byteLength: number;
  mime: string;
  eventId?: string | null;
}

export interface FoodVisionService {
  readonly name: string;
  analyze(input: FoodVisionInput): Promise<FoodVisionResult>;
}

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

export class RealVisionService implements FoodVisionService {
  readonly name = "real-scaffold";

  async analyze(): Promise<FoodVisionResult> {
    throw new Error(
      "Real vision APIs require a provider key. Use MockFoodVisionService until credentials exist.",
    );
  }
}

export function getFoodVisionService(): FoodVisionService {
  return new MockFoodVisionService();
}
