import { APP_TIMEZONE } from "@/lib/config";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function partsMap(date: Date, timeZone: string): Record<string, number> {
  const parts = getFormatter(timeZone).formatToParts(date);
  const out: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return out;
}

/**
 * Convert a civil wall-clock time in `timeZone` to an absolute Instant.
 * Does not invent DST offsets — uses Intl to resolve the real offset.
 */
export function zonedWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  timeZone: string = APP_TIMEZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const asZone = partsMap(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    asZone.year,
    asZone.month - 1,
    asZone.day,
    asZone.hour,
    asZone.minute,
    asZone.second,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function zonedWallTimeToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  timeZone: string = APP_TIMEZONE,
): string {
  return zonedWallTimeToDate(
    year,
    month,
    day,
    hour,
    minute,
    second,
    timeZone,
  ).toISOString();
}

export function parseIsoDate(isoDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

export function addDaysIso(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const utc = Date.UTC(year, month - 1, day + days);
  const dt = new Date(utc);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calendarDateInZone(
  date: Date,
  timeZone = APP_TIMEZONE,
): string {
  const p = partsMap(date, timeZone);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${p.year}-${m}-${d}`;
}

export function hourMinuteInZone(
  date: Date,
  timeZone = APP_TIMEZONE,
): { hour: number; minute: number } {
  const p = partsMap(date, timeZone);
  return { hour: p.hour, minute: p.minute };
}

export function formatTimeRange(
  startIso: string,
  endIso: string | null,
  timeZone = APP_TIMEZONE,
): string {
  const start = formatTime(startIso, timeZone);
  if (!endIso) return start;
  return `${start}–${formatTime(endIso, timeZone)}`;
}

export function formatTime(iso: string, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLongDate(isoDate: string, timeZone = APP_TIMEZONE): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = zonedWallTimeToDate(year, month, day, 12, 0, 0, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatShortDate(isoDate: string, timeZone = APP_TIMEZONE): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = zonedWallTimeToDate(year, month, day, 12, 0, 0, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function relativeDeadline(
  deadlineIso: string,
  now = new Date(),
): string {
  const ms = new Date(deadlineIso).getTime() - now.getTime();
  if (Number.isNaN(ms)) return "Unknown deadline";
  const abs = Math.abs(ms);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  if (ms < 0) {
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 36) return `${hours} hr ago`;
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (minutes < 60) return `${minutes} min left`;
  if (hours < 36) return `${hours} hr left`;
  return `${days} day${days === 1 ? "" : "s"} left`;
}
