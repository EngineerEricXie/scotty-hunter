import type { DietaryCompatibility, Event } from "@/lib/types";

const MEAT_TAGS = new Set(["meat", "meat-only", "non-vegetarian"]);

export function dietaryCompatibility(event: Event, constraint: string): DietaryCompatibility {
  const key = constraint.trim().toLowerCase();
  const tags = event.dietary_tags.map((tag) => tag.toLowerCase());
  if (!key) return "UNKNOWN";

  if (tags.includes(key)) return "COMPATIBLE";

  if (key === "vegetarian" || key === "vegan") {
    if (tags.some((tag) => MEAT_TAGS.has(tag))) return "INCOMPATIBLE";
  }
  if (key === "vegan" && tags.includes("vegetarian") && !tags.includes("vegan")) {
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

export function worstDietaryCompatibility(
  event: Event,
  constraints: string[],
): DietaryCompatibility {
  if (constraints.length === 0) return "COMPATIBLE";
  const results = constraints.map((constraint) => dietaryCompatibility(event, constraint));
  if (results.includes("INCOMPATIBLE")) return "INCOMPATIBLE";
  if (results.includes("UNKNOWN")) return "UNKNOWN";
  return "COMPATIBLE";
}
