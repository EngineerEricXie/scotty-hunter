import type { FoodClassification, FoodStatus, FoodType } from "@/lib/types";

const NEGATION =
  /\b(no food|food will not|will not (be )?(provide|serve|include) food|not providing food|food not provided|without food|bring your own(?: food)?|byo food|meals? not included|dinner not included|lunch not included)\b/i;

const EXPLICIT_PATTERNS: { re: RegExp; types: FoodType[]; confidence: number }[] =
  [
    { re: /\bfree pizza\b/i, types: ["pizza", "lunch"], confidence: 0.99 },
    { re: /\bpizza will be (served|provided)\b/i, types: ["pizza"], confidence: 0.97 },
    {
      re: /\b(lunch will be (provided|served|included)|lunch (is )?provided|free lunch)\b/i,
      types: ["lunch"],
      confidence: 0.98,
    },
    {
      re: /\b(dinner will be (provided|served|included)|dinner (is )?provided|free dinner)\b/i,
      types: ["dinner"],
      confidence: 0.98,
    },
    {
      re: /\b(breakfast will be (provided|served|included)|breakfast (is )?(provided|included)|free breakfast)\b/i,
      types: ["breakfast"],
      confidence: 0.98,
    },
    {
      re: /\b(brunch will be (provided|served)|free brunch)\b/i,
      types: ["brunch"],
      confidence: 0.96,
    },
    {
      re: /\b(food (will be )?(provided|served)|meals? (will be )?(provided|served)|food included)\b/i,
      types: ["unknown"],
      confidence: 0.95,
    },
    {
      re: /\bmidnight snacks? will be provided\b/i,
      types: ["snacks"],
      confidence: 0.94,
    },
    {
      re: /\bmidnight snacks?\b/i,
      types: ["snacks"],
      confidence: 0.92,
    },
    {
      re: /\b(free food|complimentary (lunch|dinner|breakfast|food|meal))\b/i,
      types: ["unknown"],
      confidence: 0.96,
    },
  ];

const LIKELY_PATTERNS: { re: RegExp; types: FoodType[]; confidence: number }[] =
  [
    {
      re: /\brefreshments will be served\b/i,
      types: ["refreshments"],
      confidence: 0.78,
    },
    {
      re: /\b(light )?refreshments\b/i,
      types: ["refreshments"],
      confidence: 0.72,
    },
    {
      re: /\bcatered reception\b/i,
      types: ["catering"],
      confidence: 0.8,
    },
    {
      re: /\breception (follows|following|to follow)\b/i,
      types: ["catering", "refreshments"],
      confidence: 0.7,
    },
    {
      re: /\bsnacks will be available\b/i,
      types: ["snacks"],
      confidence: 0.74,
    },
    {
      re: /\b(hospitality|light bites|coffee and (snacks|bites))\b/i,
      types: ["snacks", "drinks"],
      confidence: 0.68,
    },
  ];

const POSSIBLE_PATTERNS: { re: RegExp; types: FoodType[]; confidence: number }[] =
  [
    { re: /\bnetworking (event|social|mixer)\b/i, types: ["unknown"], confidence: 0.35 },
    { re: /\bcelebration\b/i, types: ["unknown"], confidence: 0.32 },
    { re: /\bmixer\b/i, types: ["unknown"], confidence: 0.34 },
    { re: /\bsocial hour\b/i, types: ["drinks"], confidence: 0.36 },
    { re: /\bhappy hour\b/i, types: ["drinks"], confidence: 0.38 },
  ];

const ITEM_PATTERNS: { re: RegExp; item: string }[] = [
  { re: /\bpizza\b/i, item: "pizza" },
  { re: /\bsandwich(es)?\b/i, item: "sandwiches" },
  { re: /\btacos?\b/i, item: "tacos" },
  { re: /\bsalad\b/i, item: "salad" },
  { re: /\b(pastries|pastry|croissant)/i, item: "pastries" },
  { re: /\bcoffee\b/i, item: "coffee" },
  { re: /\bbagels?\b/i, item: "bagels" },
  { re: /\bcookies?\b/i, item: "cookies" },
];

const CUISINE_PATTERNS: { re: RegExp; tag: string }[] = [
  { re: /\bchinese\b/i, tag: "Chinese" },
  { re: /\bkorean\b/i, tag: "Korean" },
  { re: /\bjapanese\b/i, tag: "Japanese" },
  { re: /\bindian\b/i, tag: "Indian" },
  { re: /\bmediterranean\b/i, tag: "Mediterranean" },
  { re: /\bmexican\b/i, tag: "Mexican" },
  { re: /\bitalian\b/i, tag: "Italian" },
  { re: /\basian (food|catering|cuisine)?\b/i, tag: "Asian" },
  { re: /\bamerican\b/i, tag: "American" },
];

const DIETARY_COMPATIBLE: { re: RegExp; tag: string }[] = [
  { re: /\bvegetarian options?\b/i, tag: "vegetarian" },
  { re: /\bvegetarian pizza\b/i, tag: "vegetarian" },
  { re: /\bvegetarian(?:-friendly)?\b/i, tag: "vegetarian" },
  { re: /\bvegan\b/i, tag: "vegan" },
  { re: /\bhalal\b/i, tag: "halal" },
  { re: /\bkosher\b/i, tag: "kosher" },
  { re: /\bgluten[-\s]?free\b/i, tag: "gluten-free" },
  { re: /\bdairy[-\s]?free\b/i, tag: "dairy-free" },
  { re: /\bnut[-\s]?free\b/i, tag: "nut-free" },
];

const DIETARY_INCOMPATIBLE: { re: RegExp; tag: string }[] = [
  { re: /\bmeat[-\s]?only\b/i, tag: "meat" },
  { re: /\bno vegetarian\b/i, tag: "meat" },
  { re: /\bpepperoni only\b/i, tag: "meat" },
  { re: /\bsteak lunch\b/i, tag: "meat" },
  { re: /\b(pulled pork|brisket) (bbq|barbecue)\b/i, tag: "meat" },
];

function firstMatch(
  text: string,
  patterns: { re: RegExp; types: FoodType[]; confidence: number }[],
): { evidence: string; types: FoodType[]; confidence: number } | null {
  for (const pattern of patterns) {
    const match = text.match(pattern.re);
    if (match?.[0]) {
      return {
        evidence: clipEvidence(text, match[0]),
        types: pattern.types,
        confidence: pattern.confidence,
      };
    }
  }
  return null;
}

function clipEvidence(text: string, needle: string): string {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return needle;
  const before = text.slice(0, idx);
  const start =
    Math.max(before.lastIndexOf("\n"), before.lastIndexOf("."), before.lastIndexOf("!")) + 1;
  const rest = text.slice(idx + needle.length);
  const newline = rest.indexOf("\n");
  const period = rest.search(/[.!]/);
  let endOffset = rest.length;
  if (newline >= 0) endOffset = Math.min(endOffset, newline);
  if (period >= 0) endOffset = Math.min(endOffset, period + 1);
  return text
    .slice(start, idx + needle.length + endOffset)
    .replace(/\s+/g, " ")
    .trim();
}

function mealTypesFromContext(text: string, types: FoodType[]): FoodType[] {
  const extra: FoodType[] = [];
  if (/\bpizza\b/i.test(text) && !types.includes("pizza")) extra.push("pizza");
  if (/\bdessert\b/i.test(text) && !types.includes("dessert")) extra.push("dessert");
  if (/\b(coffee|drinks?|beverages?)\b/i.test(text) && !types.includes("drinks")) {
    extra.push("drinks");
  }
  return [...types, ...extra];
}

export function extractFoodMetadata(text: string): {
  items: string[];
  cuisine_tags: string[];
  dietary_tags: string[];
} {
  const items: string[] = [];
  for (const pattern of ITEM_PATTERNS) {
    if (pattern.re.test(text) && !items.includes(pattern.item)) items.push(pattern.item);
  }
  const cuisine_tags: string[] = [];
  for (const pattern of CUISINE_PATTERNS) {
    if (pattern.re.test(text) && !cuisine_tags.includes(pattern.tag)) {
      cuisine_tags.push(pattern.tag);
    }
  }
  const dietary_tags: string[] = [];
  for (const pattern of DIETARY_INCOMPATIBLE) {
    if (pattern.re.test(text) && !dietary_tags.includes(pattern.tag)) {
      dietary_tags.push(pattern.tag);
    }
  }
  for (const pattern of DIETARY_COMPATIBLE) {
    if (pattern.re.test(text) && !dietary_tags.includes(pattern.tag)) {
      dietary_tags.push(pattern.tag);
    }
  }
  return { items, cuisine_tags, dietary_tags };
}

export function classifyFood(text: string): FoodClassification {
  const source = text.trim();
  const emptyMeta = { items: [] as string[], cuisine_tags: [] as string[], dietary_tags: [] as string[] };
  if (!source) {
    return { status: "NONE", types: [], confidence: 0, evidence: null, ...emptyMeta };
  }

  const meta = extractFoodMetadata(source);

  if (NEGATION.test(source)) {
    const match = source.match(NEGATION);
    return {
      status: "NONE",
      types: [],
      confidence: 0,
      evidence: match?.[0] ? clipEvidence(source, match[0]) : null,
      ...emptyMeta,
    };
  }

  const explicit = firstMatch(source, EXPLICIT_PATTERNS);
  if (explicit) {
    return {
      status: "EXPLICIT",
      types: mealTypesFromContext(source, explicit.types),
      confidence: explicit.confidence,
      evidence: explicit.evidence,
      ...meta,
    };
  }

  const likely = firstMatch(source, LIKELY_PATTERNS);
  if (likely) {
    return {
      status: "LIKELY",
      types: mealTypesFromContext(source, likely.types),
      confidence: likely.confidence,
      evidence: likely.evidence,
      ...meta,
    };
  }

  const possible = firstMatch(source, POSSIBLE_PATTERNS);
  if (possible) {
    return {
      status: "POSSIBLE",
      types: mealTypesFromContext(source, possible.types),
      confidence: possible.confidence,
      evidence: possible.evidence,
      ...meta,
    };
  }

  return { status: "NONE", types: [], confidence: 0, evidence: null, ...emptyMeta };
}

export function foodStatusRank(status: FoodStatus): number {
  switch (status) {
    case "EXPLICIT":
      return 4;
    case "LIKELY":
      return 3;
    case "POSSIBLE":
      return 2;
    default:
      return 1;
  }
}

export function foodStatusLabel(status: FoodStatus): string {
  switch (status) {
    case "EXPLICIT":
      return "Confirmed food";
    case "LIKELY":
      return "Likely food";
    case "POSSIBLE":
      return "Possible food";
    default:
      return "No food evidence";
  }
}
