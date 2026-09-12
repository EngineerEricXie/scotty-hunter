export interface FoodVisionResult {
  labels: string[];
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
    if (lower.includes("pizza") || lower.includes("pepperoni")) {
      return { labels: ["Pepperoni pizza", "Salad"], confidence: 0.82, provider: "mock" };
    }
    if (lower.includes("bagel") || lower.includes("breakfast")) {
      return { labels: ["Bagels", "Coffee"], confidence: 0.74, provider: "mock" };
    }
    if (mime.startsWith("image/")) {
      return { labels: ["Campus catering tray", "Cookies"], confidence: 0.61, provider: "mock" };
    }
    return { labels: ["Unknown dish"], confidence: 0.2, provider: "mock" };
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
