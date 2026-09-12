import { applyPreferencePatch, heuristicPreferencePatch } from "@/lib/personalization/apply-patch";
import type { UserPreference } from "@/lib/types";

export const DEMO_PERSONA_UTTERANCE =
  "I'm vegetarian, like pizza and Asian food, on campus Monday/Wednesday/Friday and Saturday for lunch and dinner, walk at most 12 minutes, and I'm willing to RSVP.";

export function applyDemoPersona(current: UserPreference): UserPreference {
  const patch = heuristicPreferencePatch(DEMO_PERSONA_UTTERANCE);
  return applyPreferencePatch(current, patch, DEMO_PERSONA_UTTERANCE);
}
