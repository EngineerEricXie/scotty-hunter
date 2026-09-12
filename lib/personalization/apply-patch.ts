import type { UserPreference, Weekday } from "@/lib/types";
import type { PreferencePatch } from "@/lib/personalization/preference-schema";

const BUILDING_ALIASES: Record<string, string> = {
  gates: "ghc",
  ghc: "ghc",
  "hillman": "ghc",
  tepper: "tepper",
  cuc: "cuc",
  cohon: "cuc",
  wean: "wean",
  doherty: "doherty",
  hunt: "hunt",
  nsh: "nsh",
  hamburg: "hamburg",
  hbh: "hamburg",
  posner: "posner",
};

const WEEKDAYS: { re: RegExp; id: Weekday }[] = [
  { re: /monday|\bmon\b|週一|周一/i, id: "monday" },
  { re: /tuesday|\btue\b|週二|周二/i, id: "tuesday" },
  { re: /wednesday|\bwed\b|週三|周三/i, id: "wednesday" },
  { re: /thursday|\bthu\b|週四|周四/i, id: "thursday" },
  { re: /friday|\bfri\b|週五|周五/i, id: "friday" },
  { re: /saturday|\bsat\b|週六|周六/i, id: "saturday" },
  { re: /sunday|\bsun\b|週日|周日/i, id: "sunday" },
];

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * Deterministic fallback when the LLM is unavailable. Only fills fields
 * the utterance actually mentions.
 */
export function heuristicPreferencePatch(utterance: string): PreferencePatch {
  const text = utterance.trim();
  const lower = text.toLowerCase();

  const campus_days = unique(
    WEEKDAYS.filter((day) => day.re.test(text)).map((day) => day.id),
  );

  const dietary: string[] = [];
  if (/素食|vegetarian/.test(lower) && !/not vegetarian|不吃素/.test(lower)) dietary.push("vegetarian");
  if (/純素|vegan/.test(lower)) dietary.push("vegan");
  if (/清真|halal/.test(lower)) dietary.push("halal");
  if (/猶太|kosher/.test(lower)) dietary.push("kosher");
  if (/麩質|gluten[-\s]?free/.test(lower)) dietary.push("gluten-free");
  if (/沒有飲食限制|no diet|no dietary|不挑食/.test(lower)) dietary.length = 0;

  const favorites: string[] = [];
  const cuisines: string[] = [];
  if (/披薩|pizza/.test(lower)) favorites.push("pizza");
  if (/亞洲|asian/.test(lower)) {
    favorites.push("Asian food");
    cuisines.push("Asian");
  }
  if (/印度|indian/.test(lower)) {
    favorites.push("Indian food");
    cuisines.push("Indian");
  }
  if (/墨西哥|mexican/.test(lower)) {
    favorites.push("Mexican food");
    cuisines.push("Mexican");
  }
  if (/三明治|sandwich/.test(lower)) favorites.push("sandwiches");

  const disliked: string[] = [];
  const dislikeMatch = text.match(/(?:don't like|dislike|不喜歡|討厭)\s+([^,.!?，。]+)/i);
  if (dislikeMatch?.[1]) disliked.push(dislikeMatch[1].trim());

  let willing_to_rsvp: PreferencePatch["willing_to_rsvp"] = null;
  if (/不願意?\s*rsvp|不要報名|不想登記|won't rsvp|not willing to rsvp|no rsvp/i.test(text)) {
    willing_to_rsvp = "no";
  } else if (/願意\s*rsvp|可以報名|willing to rsvp|happy to rsvp|i can rsvp/i.test(text)) {
    willing_to_rsvp = "yes";
  } else if (/值得才|only if worth/i.test(text)) {
    willing_to_rsvp = "only_if_worth_it";
  }

  let explicit_only: boolean | null = null;
  let include_likely: boolean | null = null;
  if (/explicit only|只要明確|只要確認有食物/.test(lower)) {
    explicit_only = true;
    include_likely = false;
  }

  const walkMatch = text.match(
    /(?:最多|max(?:imum)?|at most|no more than|walk(?:ing)?(?:\s+at most)?)\s*(\d{1,2})\s*(?:min|minutes|分鐘)?/i,
  ) ?? text.match(/(\d{1,2})\s*(?:min|minutes|分鐘)\s*(?:walk|步行|走路)/i);
  const max_walking_minutes = walkMatch ? Number(walkMatch[1]) : null;

  let home_building_id: string | null = null;
  for (const [alias, id] of Object.entries(BUILDING_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(text)) {
      home_building_id = id;
      break;
    }
  }

  const mentionedMeals =
    /breakfast|lunch|dinner|snacks|早餐|午餐|晚餐|點心/.test(lower);
  const wants_breakfast = mentionedMeals ? /breakfast|早餐/.test(lower) : null;
  const wants_lunch = mentionedMeals ? /lunch|午餐/.test(lower) : null;
  const wants_dinner = mentionedMeals ? /dinner|晚餐/.test(lower) : null;
  const wants_snacks = mentionedMeals ? /snacks?|點心/.test(lower) : null;

  const summaryParts = [
    dietary.length ? dietary.join(", ") : null,
    favorites.length ? `likes ${favorites.join(", ")}` : null,
    campus_days.length ? campus_days.join("/") : null,
    mentionedMeals
      ? ["breakfast", "lunch", "dinner", "snacks"].filter((_, i) =>
          [wants_breakfast, wants_lunch, wants_dinner, wants_snacks][i],
        ).join(" + ")
      : null,
    max_walking_minutes != null ? `≤ ${max_walking_minutes} min walk` : null,
    willing_to_rsvp ? `RSVP: ${willing_to_rsvp}` : null,
  ].filter(Boolean);

  return {
    campus_days: campus_days.length ? campus_days : null,
    wants_breakfast,
    wants_lunch,
    wants_dinner,
    wants_snacks,
    dietary_constraints: dietary.length || /沒有飲食限制|no diet/.test(lower) ? dietary : null,
    favorite_foods: favorites.length ? favorites : null,
    disliked_foods: disliked.length ? disliked : null,
    preferred_cuisines: cuisines.length ? cuisines : null,
    max_walking_minutes,
    ideal_walking_minutes:
      max_walking_minutes != null ? Math.min(10, max_walking_minutes) : null,
    willing_to_rsvp,
    explicit_only,
    include_likely,
    home_building_id,
    summary: summaryParts.join(" · ") || "No preference changes detected.",
  };
}

export function applyPreferencePatch(
  current: UserPreference,
  patch: PreferencePatch,
  utterance: string,
): UserPreference {
  const next: UserPreference = {
    ...current,
    last_preference_utterance: utterance,
    seen_onboarding: true,
    updated_at: new Date().toISOString(),
  };
  if (patch.campus_days != null) next.campus_days = patch.campus_days;
  if (patch.wants_breakfast != null) next.wants_breakfast = patch.wants_breakfast;
  if (patch.wants_lunch != null) next.wants_lunch = patch.wants_lunch;
  if (patch.wants_dinner != null) next.wants_dinner = patch.wants_dinner;
  if (patch.wants_snacks != null) next.wants_snacks = patch.wants_snacks;
  if (patch.dietary_constraints != null) next.dietary_constraints = patch.dietary_constraints;
  if (patch.favorite_foods != null) next.favorite_foods = patch.favorite_foods;
  if (patch.disliked_foods != null) next.disliked_foods = patch.disliked_foods;
  if (patch.preferred_cuisines != null) next.preferred_cuisines = patch.preferred_cuisines;
  if (patch.max_walking_minutes != null) next.max_walking_minutes = patch.max_walking_minutes;
  if (patch.ideal_walking_minutes != null) {
    next.ideal_walking_minutes = patch.ideal_walking_minutes;
  } else if (patch.max_walking_minutes != null) {
    next.ideal_walking_minutes = Math.min(next.ideal_walking_minutes, patch.max_walking_minutes);
  }
  if (patch.willing_to_rsvp) next.willing_to_rsvp = patch.willing_to_rsvp;
  if (patch.explicit_only != null) next.explicit_only = patch.explicit_only;
  if (patch.include_likely != null) next.include_likely = patch.include_likely;
  if (patch.home_building_id) next.home_building_id = patch.home_building_id;
  next.preference_summary = englishPreferenceSummary(next, patch.summary);
  return next;
}

export function describePreferences(prefs: UserPreference): string {
  const meals = [
    prefs.wants_breakfast ? "breakfast" : null,
    prefs.wants_lunch ? "lunch" : null,
    prefs.wants_dinner ? "dinner" : null,
    prefs.wants_snacks ? "snacks" : null,
  ].filter(Boolean);
  return [
    prefs.campus_days.length ? `Campus ${prefs.campus_days.join(", ")}` : null,
    meals.length ? meals.join(" + ") : null,
    prefs.dietary_constraints.length ? prefs.dietary_constraints.join(", ") : "no dietary constraint",
    prefs.favorite_foods.length ? `likes ${prefs.favorite_foods.join(", ")}` : null,
    `≤ ${prefs.max_walking_minutes} min walk from ${prefs.home_building_id.toUpperCase()}`,
    `RSVP ${prefs.willing_to_rsvp.replaceAll("_", " ")}`,
    prefs.explicit_only ? "explicit food only" : prefs.include_likely ? "include likely food" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function englishPreferenceSummary(prefs: UserPreference, summary?: string): string {
  const text = summary?.trim() ?? "";
  if (text && !/[\u4e00-\u9fff]/.test(text)) return text;
  return describePreferences(prefs);
}
