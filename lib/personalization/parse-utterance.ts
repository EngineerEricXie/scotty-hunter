import { SERVER_CONFIG } from "@/lib/config";
import { completeOpenAiJson, hasOpenAiCompatibleCredentials } from "@/lib/llm/chat";
import {
  applyPreferencePatch,
  heuristicPreferencePatch,
} from "@/lib/personalization/apply-patch";
import { PreferencePatchSchema } from "@/lib/personalization/preference-schema";
import type { UserPreference } from "@/lib/types";

const SYSTEM = [
  "You extract Carnegie Mellon student meal-planning preferences from one utterance.",
  "Reply with a single JSON object only. The first character must be '{'. No markdown. No analysis.",
  "Unmentioned fields MUST be null. Do not guess. Empty dietary_constraints means the user said they have no diet restriction.",
  "campus_days values: monday|tuesday|wednesday|thursday|friday|saturday|sunday.",
  "willing_to_rsvp: yes | only_if_worth_it | no.",
  "home_building_id if mentioned: ghc|tepper|cuc|wean|doherty|hunt|nsh|hamburg|posner.",
  "favorite_foods examples: pizza, Asian food, Indian food, sandwiches.",
  "preferred_cuisines examples: Asian, Indian, Mexican.",
  "summary: one short English sentence confirming what you understood. Never use Chinese or other non-English text.",
  '{"campus_days":["monday","wednesday","friday"],"wants_breakfast":false,"wants_lunch":true,"wants_dinner":true,"wants_snacks":false,"dietary_constraints":["vegetarian"],"favorite_foods":["pizza","Asian food"],"disliked_foods":[],"preferred_cuisines":["Asian"],"max_walking_minutes":12,"ideal_walking_minutes":8,"willing_to_rsvp":"yes","explicit_only":null,"include_likely":null,"home_building_id":"ghc","summary":"Vegetarian, pizza and Asian food, M/W/F lunch and dinner, 12 minute walk, will RSVP."}',
].join("\n");

export async function parsePreferenceUtterance(input: {
  utterance: string;
  current: UserPreference;
}): Promise<{
  preferences: UserPreference;
  summary: string;
  source: "llm" | "heuristic";
  warning?: string;
}> {
  const utterance = input.utterance.trim();
  if (!utterance) {
    throw new Error("Say what you eat, when you are on campus, and how far you will walk.");
  }

  if (hasOpenAiCompatibleCredentials()) {
    try {
      const raw = await completeOpenAiJson({
        system: SYSTEM,
        user: [
          `Current preferences JSON:\n${JSON.stringify(snapshot(input.current))}`,
          `Utterance:\n${utterance}`,
          "Output one JSON object now, not an array.",
        ].join("\n\n"),
        maxTokens: 8192,
        reasoningEffort: "low",
      });
      const payload = unwrapPreferencePayload(raw);
      const parsed = PreferencePatchSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(
          `${parsed.error.message} · payload=${JSON.stringify(payload).slice(0, 280)}`,
        );
      }
      const preferences = applyPreferencePatch(input.current, parsed.data, utterance);
      return {
        preferences,
        summary: preferences.preference_summary,
        source: "llm",
      };
    } catch (error) {
      const fallback = heuristicPreferencePatch(utterance);
      const preferences = applyPreferencePatch(input.current, fallback, utterance);
      return {
        preferences,
        summary: fallback.summary,
        source: "heuristic",
        warning:
          error instanceof Error
            ? `Agent API failed (${error.message}). Used a local parser instead.`
            : "Agent API failed. Used a local parser instead.",
      };
    }
  }

  const fallback = heuristicPreferencePatch(utterance);
  const preferences = applyPreferencePatch(input.current, fallback, utterance);
  return {
    preferences,
    summary: fallback.summary,
    source: "heuristic",
    warning: `No OPENAI_API_KEY. Local parser used. Set OPENAI_BASE_URL=${SERVER_CONFIG.openaiBaseUrl} plus a key to use the agent.`,
  };
}

function snapshot(prefs: UserPreference) {
  return {
    campus_days: prefs.campus_days,
    wants_breakfast: prefs.wants_breakfast,
    wants_lunch: prefs.wants_lunch,
    wants_dinner: prefs.wants_dinner,
    wants_snacks: prefs.wants_snacks,
    dietary_constraints: prefs.dietary_constraints,
    favorite_foods: prefs.favorite_foods,
    disliked_foods: prefs.disliked_foods,
    preferred_cuisines: prefs.preferred_cuisines,
    max_walking_minutes: prefs.max_walking_minutes,
    willing_to_rsvp: prefs.willing_to_rsvp,
    explicit_only: prefs.explicit_only,
    include_likely: prefs.include_likely,
    home_building_id: prefs.home_building_id,
  };
}

export function unwrapPreferencePayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    const objects = raw.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
    if (objects.length === 1) return objects[0];
    if (objects.length > 1) return Object.assign({}, ...objects);
    return raw;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["preferences", "patch", "data", "result"]) {
      const inner = obj[key];
      if (!inner || typeof inner !== "object" || Array.isArray(inner)) continue;
      if (typeof obj.summary === "string" && !("summary" in inner)) {
        return { ...(inner as Record<string, unknown>), summary: obj.summary };
      }
      return inner;
    }
  }
  return raw;
}
