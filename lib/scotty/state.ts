import type { Event } from "@/lib/types";
import { ATLAS_SPECIES, matchAtlasIds } from "@/lib/scotty/atlas";
import { loadPoints } from "@/lib/storage/local-state";

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

export interface NowGoingPing {
  id: string;
  eventId: string;
  title: string;
  buildingId: string | null;
  dish: string;
  handle: string;
  kind: NowGoingKind;
  at: string;
}

export interface ScottyState {
  name: string;
  points: number;
  xp: number;
  hunger: number;
  lastFedAt: string | null;
  atlas: Record<string, AtlasEntry>;
  checkins: PhotoCheckIn[];
  nowGoing: NowGoingPing[];
  quests: Record<string, boolean>;
  seenSplash: boolean;
  createdAt: string;
  updatedAt: string;
}

export const QUESTS = [
  { id: "snap", title: "SNAP A DISH", detail: "Photograph free food and let Scotty grade it.", xp: 20 },
  { id: "feed", title: "FEED SCOTTY", detail: "Turn a confirmed photo into a treat.", xp: 12 },
  { id: "radar", title: "PING THE RADAR", detail: "Report plenty / some at a live table.", xp: 8 },
  { id: "atlas3", title: "CATCH 3 SPECIES", detail: "Fill three Food Dex entries.", xp: 15 },
] as const;

const DEFAULT_STATE: ScottyState = {
  name: "Scotty",
  points: 0,
  xp: 0,
  hunger: 42,
  lastFedAt: null,
  atlas: {},
  checkins: [],
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
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as ScottyState) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function write(state: ScottyState) {
  if (typeof window === "undefined") return;
  const next = { ...state, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

function migrateFirstRun(): ScottyState {
  const inherited = loadPoints();
  const now = Date.now();
  const seeded: ScottyState = {
    ...DEFAULT_STATE,
    points: inherited,
    xp: inherited,
    createdAt: new Date().toISOString(),
    nowGoing: [
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
        id: "demo-cookie",
        eventId: "demo-cookie-hour",
        title: "Cookie Hour",
        buildingId: "doherty",
        dish: "Cookie Hour",
        handle: "WeanWalker",
        kind: "demo",
        at: new Date(now - 22 * 60_000).toISOString(),
      },
    ],
  };
  write(seeded);
  return seeded;
}

export function loadScotty(): ScottyState {
  return decayHunger(read());
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

export function liveNowGoing(state: ScottyState = loadScotty(), now = Date.now()): NowGoingPing[] {
  return state.nowGoing
    .filter((ping) => now - new Date(ping.at).getTime() <= LIVE_MS)
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
    handle: input.handle ?? "YOU",
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
  if (Object.keys(state.atlas).length >= 3) state.quests = { ...state.quests, atlas3: true };
  state.nowGoing = [
    ...state.nowGoing,
    {
      id: `go-photo-${Date.now()}`,
      eventId: input.eventId ?? "wild-photo",
      title: input.title ?? "Campus catch",
      buildingId: input.buildingId ?? null,
      dish: ATLAS_SPECIES.find((s) => s.id === atlasIds[0])?.name ?? input.labels[0] ?? "Food",
      handle: "YOU",
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

export function atlasProgress(state: ScottyState = loadScotty()): { caught: number; total: number } {
  return { caught: Object.keys(state.atlas).length, total: ATLAS_SPECIES.length };
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
