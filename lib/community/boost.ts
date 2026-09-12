import type { Event } from "@/lib/types";

const STOP = new Set([
  "the",
  "a",
  "an",
  "at",
  "in",
  "on",
  "for",
  "and",
  "of",
  "to",
  "cmu",
  "event",
  "free",
  "with",
  "plus",
  "workshop",
  "session",
]);

export function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP.has(token));
}

export function titleSimilarity(a: string, b: string): number {
  const left = new Set(titleTokens(a));
  const right = new Set(titleTokens(b));
  if (left.size === 0 || right.size === 0) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export interface CommunityPing {
  eventId: string;
  title: string;
  buildingId: string | null;
  at: string;
}

export interface BoostResult {
  base: number;
  confidence: number;
  boost: number;
  reasons: string[];
}

function sameMealWindow(a: Event, b: Event): boolean {
  const ha = new Date(a.start_time).getHours();
  const hb = new Date(b.start_time).getHours();
  const bucket = (h: number) =>
    h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snacks";
  return bucket(ha) === bucket(hb);
}

export function boostEvent(
  event: Event,
  corpus: Event[],
  pings: CommunityPing[] = [],
  now = Date.now(),
): BoostResult {
  const base = event.base_confidence ?? event.food_confidence;
  if (event.food_status === "NONE") {
    return { base, confidence: base, boost: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let boost = 0;
  const similar = corpus.filter(
    (other) =>
      other.id !== event.id &&
      other.food_status !== "NONE" &&
      titleSimilarity(event.title, other.title) >= 0.28,
  );
  if (similar.length > 0) {
    boost += Math.min(0.12, 0.04 * similar.length);
    reasons.push(
      similar.length === 1
        ? "Similar wording on another listing"
        : `${similar.length} similar worded listings`,
    );
  }

  const repeats = corpus.filter(
    (other) =>
      other.id !== event.id &&
      other.building_id &&
      other.building_id === event.building_id &&
      sameMealWindow(event, other) &&
      titleSimilarity(event.title, other.title) >= 0.22,
  );
  if (repeats.length > 0) {
    boost += 0.05;
    reasons.push("Repeat venue + meal window");
  }

  const liveWindowMs = 45 * 60_000;
  const live = pings.filter((ping) => now - new Date(ping.at).getTime() <= liveWindowMs);
  const ownLive = live.filter((ping) => ping.eventId === event.id);
  if (ownLive.length > 0) {
    boost += Math.min(0.16, 0.08 * ownLive.length);
    reasons.push("NOW GOING check-in");
  } else {
    const cousin = live.filter(
      (ping) =>
        titleSimilarity(ping.title, event.title) >= 0.28 ||
        (ping.buildingId && ping.buildingId === event.building_id),
    );
    if (cousin.length > 0) {
      boost += 0.06;
      reasons.push("Nearby / similar activity confirmed");
    }
  }

  const confidence = Math.min(0.99, Math.round((base + boost) * 100) / 100);
  return {
    base,
    confidence,
    boost: Math.round((confidence - base) * 100) / 100,
    reasons,
  };
}

export function applyCorpusBoost(events: Event[], pings: CommunityPing[] = []): Event[] {
  return events.map((event) => {
    const result = boostEvent(event, events, pings);
    return {
      ...event,
      base_confidence: result.base,
      food_confidence: result.confidence,
      boost_reasons: result.reasons,
    };
  });
}
