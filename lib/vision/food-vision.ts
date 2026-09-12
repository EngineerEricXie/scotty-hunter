import { matchAtlasIds } from "@/lib/scotty/atlas";

export interface FoodVisionResult {
  labels: string[];
  atlasIds: string[];
  confidence: number;
  provider: "mock" | "real";
}

export interface FoodVisionService {
  readonly name: string;
  analyze(fileName: string, byteLength: number, mime: string): Promise<FoodVisionResult>;
}

export class MockFoodVisionService implements FoodVisionService {
  readonly name = "mock";

  async analyze(fileName: string, _byteLength: number, mime: string): Promise<FoodVisionResult> {
    const lower = fileName.toLowerCase();
    if (lower.includes("pizza") || lower.includes("pepperoni") || lower.includes("hackcmu")) {
      const labels = ["Pepperoni pizza", "Salad", "HackCMU catering"];
      return { labels, atlasIds: matchAtlasIds(labels), confidence: 0.86, provider: "mock" };
    }
    if (lower.includes("bagel") || lower.includes("breakfast")) {
      const labels = ["Bagels", "Coffee"];
      return { labels, atlasIds: matchAtlasIds(labels), confidence: 0.78, provider: "mock" };
    }
    if (lower.includes("cookie") || lower.includes("midnight")) {
      const labels = ["Cookies", "Midnight snacks"];
      return { labels, atlasIds: matchAtlasIds(labels), confidence: 0.81, provider: "mock" };
    }
    if (mime.startsWith("image/")) {
      const labels = ["Campus catering tray", "Cookies"];
      return { labels, atlasIds: matchAtlasIds(labels), confidence: 0.64, provider: "mock" };
    }
    const labels = ["Unknown dish"];
    return { labels, atlasIds: matchAtlasIds(labels), confidence: 0.2, provider: "mock" };
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
