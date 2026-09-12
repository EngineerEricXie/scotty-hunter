import type {
  AvailabilityReport,
  AvailabilityStatus,
  Todo,
  UserPreference,
} from "@/lib/types";
import { demoNowMs, disableDemoClock } from "@/lib/demo-clock";

const PREF_KEY = "scottybites:preferences";
const TODO_KEY = "scottybites:todos";
const AVAIL_KEY = "scottybites:availability";
const POINTS_KEY = "scottybites:points";
const CHECKIN_KEY = "scottybites:checkins";
const LAST_PLAN_KEY = "scottybites:last-plan-ids";

export const DEFAULT_PREFERENCES: UserPreference = {
  id: "local",
  user_id: "local",
  preferred_days: ["today"],
  campus_days: ["monday", "wednesday", "friday"],
  wants_breakfast: false,
  wants_lunch: true,
  wants_dinner: true,
  wants_snacks: false,
  max_walking_minutes: 15,
  ideal_walking_minutes: 10,
  home_building_id: "ghc",
  usual_building_ids: ["ghc"],
  dietary_constraints: [],
  dietary_preferences: [],
  favorite_foods: [],
  disliked_foods: [],
  preferred_cuisines: [],
  include_likely: true,
  explicit_only: false,
  allow_possible_food: false,
  willing_to_rsvp: "only_if_worth_it",
  preferred_event_types: [],
  disliked_event_types: [],
  preferred_campus_zones: [],
  seen_onboarding: false,
  last_preference_utterance: "",
  preference_summary: "",
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadPreferences(): UserPreference {
  return { ...DEFAULT_PREFERENCES, ...readJson(PREF_KEY, {}) };
}

export function savePreferences(prefs: UserPreference) {
  writeJson(PREF_KEY, { ...prefs, updated_at: new Date().toISOString() });
}

export function loadTodos(): Todo[] {
  return readJson<Todo[]>(TODO_KEY, []);
}

export function saveTodos(todos: Todo[]) {
  writeJson(TODO_KEY, todos);
}

export function upsertTodo(todo: Todo) {
  const todos = loadTodos().filter((item) => item.id !== todo.id);
  todos.push(todo);
  saveTodos(todos);
}

export function loadAvailability(): AvailabilityReport[] {
  return readJson<AvailabilityReport[]>(AVAIL_KEY, []);
}

export function reportAvailability(
  eventId: string,
  status: AvailabilityStatus,
): AvailabilityReport {
  const report: AvailabilityReport = {
    event_id: eventId,
    status,
    reported_at: new Date().toISOString(),
    source: "user",
  };
  const rest = loadAvailability().filter((item) => item.event_id !== eventId);
  writeJson(AVAIL_KEY, [...rest, report]);
  return report;
}

export function latestAvailability(eventId: string): AvailabilityReport | null {
  const reports = loadAvailability()
    .filter((item) => item.event_id === eventId)
    .sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  const latest = reports[0];
  if (!latest) return null;
  const ageMs = Date.now() - new Date(latest.reported_at).getTime();
  if (ageMs > 8 * 3600_000) return null;
  return latest;
}

export function loadPoints(): number {
  return readJson<number>(POINTS_KEY, 0);
}

export function addPoints(delta: number): number {
  const next = loadPoints() + delta;
  writeJson(POINTS_KEY, next);
  return next;
}

export function recordCheckIn(payload: unknown) {
  const existing = readJson<unknown[]>(CHECKIN_KEY, []);
  writeJson(CHECKIN_KEY, [...existing, payload]);
}

export function saveLastPlanEventIds(ids: string[]) {
  writeJson(LAST_PLAN_KEY, ids);
}

export function clearLastPlanEventIds() {
  saveLastPlanEventIds([]);
}

export function loadLastPlanEventIds(): string[] {
  return readJson<string[]>(LAST_PLAN_KEY, []);
}

const LOCAL_KEYS = [PREF_KEY, TODO_KEY, AVAIL_KEY, POINTS_KEY, CHECKIN_KEY, LAST_PLAN_KEY];

export const APP_RESET_EVENT = "scottybites:reset";

/** Wipe planner, todos, check-ins, and scores back to a fresh demo install. */
export function resetLocalAppData() {
  if (typeof window === "undefined") return;
  for (const key of LOCAL_KEYS) window.localStorage.removeItem(key);
  disableDemoClock();
  seedDemoAvailability();
  window.dispatchEvent(new Event(APP_RESET_EVENT));
}

export function seedDemoAvailability(force = false) {
  if (typeof window === "undefined") return;
  if (!force && window.localStorage.getItem(AVAIL_KEY)) return;
  const now = demoNowMs();
  writeJson(AVAIL_KEY, [
    {
      event_id: "hackcmu-2026-saturday-lunch",
      status: "PLENTY",
      reported_at: new Date(now - 12 * 60_000).toISOString(),
      source: "demo",
    },
    {
      event_id: "demo-cookie-hour",
      status: "SOME",
      reported_at: new Date(now - 40 * 60_000).toISOString(),
      source: "demo",
    },
  ] satisfies AvailabilityReport[]);
}
