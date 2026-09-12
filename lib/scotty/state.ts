import { ATLAS_SPECIES, matchAtlasIds } from "@/lib/scotty/atlas";
import { getHiddenMenu, type HiddenMenu } from "@/lib/vision/hidden-menu";
import { loadPoints } from "@/lib/storage/local-state";
import { APP_CONFIG } from "@/lib/config";
import { demoNowMs } from "@/lib/demo-clock";
import { DEMO_SEEDED_EVENTS } from "@/data/fixtures/demo-events";
import { zonedWallTimeToIso } from "@/lib/timezone";

const KEY = "scottybites:scotty";
const LIVE_MS = 45 * 60_000;

export type ScottyMood = "hungry" | "ok" | "happy" | "legendary";
export type NowGoingKind = "photo" | "report" | "demo";

export interface AtlasEntry {
  count: number;
  firstAt: string;
  lastAt: string;
}

export interface PhotoCheckIn {
  id: string;
  eventId: string | null;
  labels: string[];
  atlasIds: string[];
  points: number;
  created_at: string;
}

export interface UnlockedMenu {
  eventId: string;
  unlockedAt: string;
}

export interface NowGoingPing {
  id: string;
  eventId: string;
  title: string;
  buildingId: string | null;
  dish: string;
  handle: string;
  kind: NowGoingKind;
  at: string;
  startTime?: string;
  endTime?: string;
}

export type HunterAnimal = "squirrel" | "raccoon" | "cardinal" | "terrier";

export interface TartanHunter {
  id: string;
  name: string;
  animal: HunterAnimal;
  points: number;
}

export interface ScottyState {
  name: string;
  hunterName: string;
  hunters: TartanHunter[];
  points: number;
  xp: number;
  hunger: number;
  lastFedAt: string | null;
  atlas: Record<string, AtlasEntry>;
  checkins: PhotoCheckIn[];
  unlockedMenus: Record<string, UnlockedMenu>;
  nowGoing: NowGoingPing[];
  quests: Record<string, boolean>;
  seenSplash: boolean;
  createdAt: string;
  updatedAt: string;
}

export const QUESTS = [
  { id: "snap", title: "SNAP A DISH", detail: "Photograph free food and let Scotty grade it.", xp: 20 },
  { id: "feed", title: "FEED SCOTTY", detail: "Turn a confirmed photo into a treat.", xp: 12 },
  { id: "hidden", title: "UNLOCK HIDDEN MENU", detail: "Snap a table photo and reveal dishes the listing omitted.", xp: 18 },
  { id: "radar", title: "PING THE RADAR", detail: "Report plenty / some at a live table.", xp: 8 },
  { id: "atlas3", title: "CATCH 3 SPECIES", detail: "Fill three Food Dex entries.", xp: 15 },
] as const;

export const HUNTER_SPRITES: Record<HunterAnimal, string> = {
  squirrel: "/sprites/hunter-squirrel.png",
  raccoon: "/sprites/hunter-raccoon.png",
  cardinal: "/sprites/hunter-cardinal.png",
  terrier: "/sprites/scotty-idle.png",
};

export const DEFAULT_HUNTERS: TartanHunter[] = [
  { id: "pixel-tartan", name: "PixelTartan", animal: "squirrel", points: 186 },
  { id: "rangos", name: "RangosRaider", animal: "raccoon", points: 142 },
  { id: "wean", name: "WeanWalker", animal: "cardinal", points: 97 },
];

const DEFAULT_STATE: ScottyState = {
  name: "Scotty",
  hunterName: "YOU",
  hunters: DEFAULT_HUNTERS,
  points: 0,
  xp: 0,
  hunger: 42,
  lastFedAt: null,
  atlas: {},
  checkins: [],
  unlockedMenus: {},
  nowGoing: [],
  quests: {},
  seenSplash: false,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("scotty:update"));
}

function read(): ScottyState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return migrateFirstRun();
    return normalize({ ...DEFAULT_STATE, ...(JSON.parse(raw) as ScottyState) });
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function normalize(state: ScottyState): ScottyState {
  return {
    ...DEFAULT_STATE,
    ...state,
    hunters: Array.isArray(state.hunters) && state.hunters.length > 0 ? state.hunters : DEFAULT_HUNTERS,
    hunterName: state.hunterName?.trim() || "YOU",
    name: state.name?.trim() || "Scotty",
    unlockedMenus: state.unlockedMenus && typeof state.unlockedMenus === "object" ? state.unlockedMenus : {},
  };
}

function write(state: ScottyState) {
  if (typeof window === "undefined") return;
  const next = { ...state, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

function demoEventWindow(eventId: string): { startTime: string; endTime: string } | null {
  const seeded = DEMO_SEEDED_EVENTS.find((event) => event.id === eventId);
  if (seeded?.start_time) {
    return { startTime: seeded.start_time, endTime: seeded.end_time ?? seeded.start_time };
  }
  if (eventId === "hackcmu-2026-saturday-lunch") {
    return {
      startTime: zonedWallTimeToIso(2026, 9, 12, 12, 0),
      endTime: zonedWallTimeToIso(2026, 9, 12, 13, 30),
    };
  }
  return null;
}

function pingIsHappening(ping: NowGoingPing, now: number): boolean {
  const window = ping.startTime
    ? { startTime: ping.startTime, endTime: ping.endTime ?? ping.startTime }
    : demoEventWindow(ping.eventId);
  if (!window) return ping.kind !== "demo";
  const start = new Date(window.startTime).getTime();
  const end = new Date(window.endTime).getTime();
  return now >= start && now <= end;
}

function demoLivePings(now: number): NowGoingPing[] {
  const catalog: NowGoingPing[] = [
    {
      id: "demo-ri-pizza",
      eventId: "demo-ri-pizza",
      title: "Robotics Institute pizza talk",
      buildingId: "nsh",
      dish: "RI pizza",
      handle: "GatesScout",
      kind: "demo",
      at: new Date(now - 4 * 60_000).toISOString(),
    },
    {
      id: "demo-lunch",
      eventId: "hackcmu-2026-saturday-lunch",
      title: "Saturday Lunch",
      buildingId: "cuc",
      dish: "Hackathon Pizza",
      handle: "PixelTartan",
      kind: "demo",
      at: new Date(now - 8 * 60_000).toISOString(),
    },
    {
      id: "demo-tepper-lunch",
      eventId: "demo-ai-seminar-lunch",
      title: "AI Seminar: Grounded Campus Agents",
      buildingId: "tepper",
      dish: "Seminar lunch",
      handle: "QuadRunner",
      kind: "demo",
      at: new Date(now - 14 * 60_000).toISOString(),
    },
    {
      id: "demo-cookie",
      eventId: "demo-cookie-hour",
      title: "Cookie Hour",
      buildingId: "doherty",
      dish: "Cookie Hour",
      handle: "WeanWalker",
      kind: "demo",
      at: new Date(now - 22 * 60_000).toISOString(),
    },
  ];
  return catalog
    .map((ping) => {
      const window = demoEventWindow(ping.eventId);
      return window ? { ...ping, ...window } : ping;
    })
    .filter((ping) => pingIsHappening(ping, now));
}

function nowGoingFingerprint(pings: NowGoingPing[]): string {
  return pings
    .map((ping) => `${ping.id}:${ping.eventId}:${ping.kind}:${ping.startTime ?? ""}:${ping.endTime ?? ""}`)
    .join("|");
}

function syncDemoNowGoing(state: ScottyState): ScottyState {
  if (!APP_CONFIG.demoMode) return state;
  const live = demoLivePings(demoNowMs());
  const kept = state.nowGoing.filter((ping) => ping.kind !== "demo");
  const next = [...live, ...kept];
  if (nowGoingFingerprint(next) === nowGoingFingerprint(state.nowGoing)) return state;
  const synced = { ...state, nowGoing: next, updatedAt: new Date(demoNowMs()).toISOString() };
  write(synced);
  return synced;
}

function migrateFirstRun(): ScottyState {
  const inherited = loadPoints();
  const now = demoNowMs();
  const seeded: ScottyState = {
    ...DEFAULT_STATE,
    points: inherited,
    xp: inherited,
    createdAt: new Date(now).toISOString(),
    atlas: {
      pizza: {
        count: 1,
        firstAt: new Date(now).toISOString(),
        lastAt: new Date(now).toISOString(),
      },
      cookie: {
        count: 1,
        firstAt: new Date(now).toISOString(),
        lastAt: new Date(now).toISOString(),
      },
    },
    nowGoing: demoLivePings(now),
  };
  write(seeded);
  return seeded;
}

export function loadScotty(): ScottyState {
  return syncDemoNowGoing(decayHunger(read()));
}

export function saveScotty(state: ScottyState) {
  write(state);
}

export function markSplashSeen() {
  const state = loadScotty();
  state.seenSplash = true;
  write(state);
}

function decayHunger(state: ScottyState): ScottyState {
  if (!state.lastFedAt) return state;
  const hours = (Date.now() - new Date(state.lastFedAt).getTime()) / 3_600_000;
  const hunger = Math.max(6, Math.round(state.hunger - hours * 7));
  return { ...state, hunger };
}

export function scottyLevel(xp: number): number {
  if (xp >= 120) return 3;
  if (xp >= 45) return 2;
  return 1;
}

export function scottyRank(xp: number): string {
  const level = scottyLevel(xp);
  if (level >= 3) return "TARTAN LEGEND";
  if (level >= 2) return "CAMPUS SCOUT";
  return "HUNGRY PUP";
}

export function scottyMood(state: ScottyState): ScottyMood {
  if (state.hunger < 28) return "hungry";
  if (scottyLevel(state.xp) >= 3 && state.hunger > 78) return "legendary";
  if (state.hunger > 62) return "happy";
  return "ok";
}

export function liveNowGoing(state: ScottyState = loadScotty(), now = demoNowMs()): NowGoingPing[] {
  return state.nowGoing
    .filter((ping) => now - new Date(ping.at).getTime() <= LIVE_MS)
    .filter((ping) => pingIsHappening(ping, now))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function isNowGoing(eventId: string, state?: ScottyState): boolean {
  return liveNowGoing(state).some((ping) => ping.eventId === eventId);
}

export function pingNowGoing(input: {
  eventId: string;
  title: string;
  buildingId: string | null;
  dish: string;
  handle?: string;
  kind: NowGoingKind;
}): NowGoingPing {
  const state = loadScotty();
  const ping: NowGoingPing = {
    id: `go-${Date.now()}`,
    eventId: input.eventId,
    title: input.title,
    buildingId: input.buildingId,
    dish: input.dish,
    handle: input.handle ?? state.hunterName,
    kind: input.kind,
    at: new Date().toISOString(),
  };
  state.nowGoing = [...state.nowGoing.slice(-40), ping];
  if (input.kind === "report") {
    state.points += 5;
    state.xp += 3;
    if (!state.quests.radar) {
      state.quests = { ...state.quests, radar: true };
      state.xp += 5;
    }
  }
  write(state);
  return ping;
}

export function confirmPhoto(input: {
  eventId: string | null;
  title?: string;
  buildingId?: string | null;
  labels: string[];
  unlockHiddenMenu?: boolean;
}): { state: ScottyState; atlasIds: string[]; newSpecies: string[]; points: number } {
  const state = loadScotty();
  const atlasIds = matchAtlasIds(input.labels);
  const newSpecies = atlasIds.filter((id) => !state.atlas[id]);
  const now = new Date().toISOString();
  let points = 20;
  for (const id of atlasIds) {
    const prev = state.atlas[id];
    state.atlas[id] = {
      count: (prev?.count ?? 0) + 1,
      firstAt: prev?.firstAt ?? now,
      lastAt: now,
    };
    if (!prev) points += 15;
  }
  state.points += points;
  state.xp += 12 + newSpecies.length * 6;
  state.hunger = Math.min(100, state.hunger + 24);
  state.lastFedAt = now;
  const checkin: PhotoCheckIn = {
    id: `ck-${Date.now()}`,
    eventId: input.eventId,
    labels: input.labels,
    atlasIds,
    points,
    created_at: now,
  };
  state.checkins = [...state.checkins, checkin];
  state.quests = { ...state.quests, snap: true, feed: true };
  if (input.unlockHiddenMenu && input.eventId && getHiddenMenu(input.eventId)) {
    applyMenuUnlock(state, input.eventId, now);
  }
  if (Object.keys(state.atlas).length >= 3) state.quests = { ...state.quests, atlas3: true };
  state.nowGoing = [
    ...state.nowGoing,
    {
      id: `go-photo-${Date.now()}`,
      eventId: input.eventId ?? "wild-photo",
      title: input.title ?? "Campus catch",
      buildingId: input.buildingId ?? null,
      dish: ATLAS_SPECIES.find((s) => s.id === atlasIds[0])?.name ?? input.labels[0] ?? "Food",
      handle: state.hunterName,
      kind: "photo",
      at: now,
    },
  ];
  write(state);
  return { state, atlasIds, newSpecies, points };
}

export function feedTreat(): ScottyState | { error: string } {
  const state = loadScotty();
  if (state.points < 12) return { error: "Need 12 pts for a treat." };
  state.points -= 12;
  state.xp += 4;
  state.hunger = Math.min(100, state.hunger + 18);
  state.lastFedAt = new Date().toISOString();
  state.quests = { ...state.quests, feed: true };
  write(state);
  return state;
}

function applyMenuUnlock(state: ScottyState, eventId: string, at: string): boolean {
  if (!getHiddenMenu(eventId)) return false;
  const first = !state.unlockedMenus[eventId];
  state.unlockedMenus = {
    ...state.unlockedMenus,
    [eventId]: { eventId, unlockedAt: state.unlockedMenus[eventId]?.unlockedAt ?? at },
  };
  if (first) {
    state.quests = { ...state.quests, hidden: true };
    state.points += 12;
    state.xp += 10;
  }
  return first;
}

export function isMenuUnlocked(eventId: string | null | undefined, state: ScottyState = loadScotty()): boolean {
  if (!eventId) return false;
  return Boolean(state.unlockedMenus[eventId]);
}

export function unlockHiddenMenu(eventId: string): { menu: HiddenMenu | null; firstUnlock: boolean } {
  const menu = getHiddenMenu(eventId);
  if (!menu) return { menu: null, firstUnlock: false };
  const state = loadScotty();
  const firstUnlock = applyMenuUnlock(state, eventId, new Date().toISOString());
  write(state);
  return { menu, firstUnlock };
}

export function listUnlockedMenus(state: ScottyState = loadScotty()): HiddenMenu[] {
  return Object.keys(state.unlockedMenus)
    .map((id) => getHiddenMenu(id))
    .filter((menu): menu is HiddenMenu => Boolean(menu));
}

export function atlasProgress(state: ScottyState = loadScotty()): { caught: number; total: number } {
  return { caught: Object.keys(state.atlas).length, total: ATLAS_SPECIES.length };
}

export function sanitizeHandle(name: string, fallback: string) {
  const next = name.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  return next || fallback;
}

export function renamePet(name: string) {
  const state = loadScotty();
  state.name = sanitizeHandle(name, "Scotty");
  write(state);
  return state;
}

export function renameHunter(id: string, name: string) {
  const state = loadScotty();
  if (id === "you") {
    state.hunterName = sanitizeHandle(name, "YOU");
  } else {
    state.hunters = state.hunters.map((hunter) =>
      hunter.id === id ? { ...hunter, name: sanitizeHandle(name, hunter.name) } : hunter,
    );
  }
  write(state);
  return state;
}

export function onScottyChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("scotty:update", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("scotty:update", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Empty Scotty: no photos, dex, menus, or quests. Splash stays dismissed. */
export function resetScottyToDefault(): ScottyState {
  const now = demoNowMs();
  const fresh: ScottyState = {
    ...DEFAULT_STATE,
    hunters: DEFAULT_HUNTERS.map((hunter) => ({ ...hunter })),
    seenSplash: true,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    nowGoing: demoLivePings(now),
  };
  if (typeof window === "undefined") return fresh;
  write(fresh);
  return fresh;
}
