export type AtlasRarity = "common" | "uncommon" | "rare" | "legendary";

export interface AtlasSpecies {
  id: string;
  name: string;
  blurb: string;
  rarity: AtlasRarity;
  keywords: string[];
  pixels: string;
}

export const ATLAS_SPECIES: AtlasSpecies[] = [
  {
    id: "pizza",
    name: "Hackathon Pizza",
    blurb: "The official fuel of 36-hour builds.",
    rarity: "common",
    keywords: ["pizza", "pepperoni", "slice"],
    pixels: "🍕",
  },
  {
    id: "bagel",
    name: "Morning Bagel",
    blurb: "Spotted near coffee urns before 10am.",
    rarity: "common",
    keywords: ["bagel", "breakfast", "lox"],
    pixels: "🥯",
  },
  {
    id: "cookie",
    name: "Cookie Hour",
    blurb: "A sweet campus migratory snack.",
    rarity: "common",
    keywords: ["cookie", "cookies", "dessert", "brownie"],
    pixels: "🍪",
  },
  {
    id: "sandwich",
    name: "Box Lunch",
    blurb: "Wrapped, labeled, and gone in 12 minutes.",
    rarity: "uncommon",
    keywords: ["sandwich", "wrap", "box lunch", "lunch"],
    pixels: "🥪",
  },
  {
    id: "salad",
    name: "Tepper Greens",
    blurb: "The rare leafy sighting at a free-food table.",
    rarity: "uncommon",
    keywords: ["salad", "greens", "veg"],
    pixels: "🥗",
  },
  {
    id: "coffee",
    name: "Caffeine Drop",
    blurb: "Steam pixelates above the urn.",
    rarity: "common",
    keywords: ["coffee", "latte", "espresso", "tea"],
    pixels: "☕️",
  },
  {
    id: "tray",
    name: "Catering Tray",
    blurb: "Aluminum armor. Contents classified.",
    rarity: "uncommon",
    keywords: ["catering", "tray", "campus catering"],
    pixels: "🍱",
  },
  {
    id: "midnight",
    name: "Midnight Fuel",
    blurb: "Appears only after Wean Hall goes quiet.",
    rarity: "rare",
    keywords: ["midnight", "snack", "snacks"],
    pixels: "🌙",
  },
  {
    id: "fruit",
    name: "Cut Fruit",
    blurb: "A virtuous side quest.",
    rarity: "uncommon",
    keywords: ["fruit", "apple", "orange", "berries"],
    pixels: "🍎",
  },
  {
    id: "mystery",
    name: "Mystery Dish",
    blurb: "Nobody named it. Scotty still ate it.",
    rarity: "rare",
    keywords: ["unknown", "mystery"],
    pixels: "❓",
  },
  {
    id: "tartan",
    name: "Tartan Feast",
    blurb: "HackCMU weekend legendary drop.",
    rarity: "legendary",
    keywords: ["hackcmu", "rangos", "sponsor expo", "dinner"],
    pixels: "🏆",
  },
  {
    id: "hidden",
    name: "Secret Slice",
    blurb: "Unlocked only after a table photo reveals the hidden menu.",
    rarity: "legendary",
    keywords: ["vegetarian pizza", "hidden menu", "secret slice", "vegetable dumplings", "vegetarian wrap"],
    pixels: "🔓",
  },
];

export const ATLAS_BY_ID: Record<string, AtlasSpecies> = Object.fromEntries(
  ATLAS_SPECIES.map((item) => [item.id, item]),
);

export function matchAtlasIds(labels: string[]): string[] {
  const blob = labels.join(" ").toLowerCase();
  const hits: string[] = [];
  for (const species of ATLAS_SPECIES) {
    if (species.keywords.some((key) => blob.includes(key))) hits.push(species.id);
  }
  if (hits.length === 0 && labels.length > 0) hits.push("mystery");
  return [...new Set(hits)];
}
