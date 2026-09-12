import { APP_TIMEZONE } from "@/lib/config";
import {
  addDaysIso,
  parseIsoDate,
  zonedWallTimeToIso,
} from "@/lib/timezone";

export interface TimeParseContext {
  defaultDate?: string | null;
  timezone?: string;
}

export interface ParsedTimeRange {
  startIso: string | null;
  endIso: string | null;
  incompleteReasons: string[];
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function parseMonthDayYear(
  text: string,
): { year: number; month: number; day: number } | null {
  const named = text.match(
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?,?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    const day = Number(named[2]);
    const year = Number(named[3]);
    if (month && day >= 1 && day <= 31) return { year, month, day };
  }

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }
  return null;
}

export function isoFromYmd(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface ClockTime {
  hour: number;
  minute: number;
}

export function parseClockTime(raw: string): ClockTime | null {
  const value = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (value === "noon" || value === "12 noon") return { hour: 12, minute: 0 };
  if (value === "midnight" || value === "12 midnight") {
    return { hour: 0, minute: 0 };
  }

  const mer = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (mer) {
    let hour = Number(mer[1]);
    const minute = Number(mer[2] ?? "0");
    const suffix = mer[3].replace(/\./g, "").toLowerCase();
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (suffix === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return { hour, minute };
  }

  const twentyFour = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFour) {
    return { hour: Number(twentyFour[1]), minute: Number(twentyFour[2]) };
  }
  return null;
}

export function parseTimeRangeText(
  text: string,
  context: TimeParseContext = {},
): ParsedTimeRange {
  const timezone = context.timezone ?? APP_TIMEZONE;
  const reasons: string[] = [];
  const dateFromText = parseMonthDayYear(text);
  const dateIso = dateFromText
    ? isoFromYmd(dateFromText.year, dateFromText.month, dateFromText.day)
    : context.defaultDate ?? null;

  const range = text.match(
    /\b(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2})\s*(?:–|-|—|to|until)\s*(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2})\b/i,
  );
  const single = text.match(
    /\b(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i,
  );

  const startClock = range
    ? parseClockTime(range[1])
    : single
      ? parseClockTime(single[1])
      : null;
  const endClock = range ? parseClockTime(range[2]) : null;

  if (!dateIso) {
    reasons.push("missing_date");
    return { startIso: null, endIso: null, incompleteReasons: reasons };
  }
  if (!startClock) {
    reasons.push("missing_time");
    return { startIso: null, endIso: null, incompleteReasons: reasons };
  }

  const { year, month, day } = parseIsoDate(dateIso);
  const startIso = zonedWallTimeToIso(
    year,
    month,
    day,
    startClock.hour,
    startClock.minute,
    0,
    timezone,
  );
  let endIso: string | null = null;

  if (endClock) {
    let endDate = dateIso;
    const startMinutes = startClock.hour * 60 + startClock.minute;
    const endMinutes = endClock.hour * 60 + endClock.minute;
    if (endMinutes <= startMinutes) {
      endDate = addDaysIso(dateIso, 1);
    }
    const endParts = parseIsoDate(endDate);
    endIso = zonedWallTimeToIso(
      endParts.year,
      endParts.month,
      endParts.day,
      endClock.hour,
      endClock.minute,
      0,
      timezone,
    );
  }

  return { startIso, endIso, incompleteReasons: reasons };
}

export function resolveWeekdayDeadline(
  text: string,
  contextDate: string | null,
  timezone: string = APP_TIMEZONE,
): string | null {
  const match = text.match(
    /register by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)))?/i,
  );
  if (!match || !contextDate) return null;
  const targetDow = WEEKDAYS[match[1].toLowerCase()];
  const clock = parseClockTime(match[2] ?? "11:59 p.m.") ?? {
    hour: 23,
    minute: 59,
  };
  const { year, month, day } = parseIsoDate(contextDate);
  const context = new Date(Date.UTC(year, month - 1, day));
  const currentDow = context.getUTCDay();
  let delta = targetDow - currentDow;
  if (delta < 0) delta += 7;
  const deadlineDate = addDaysIso(contextDate, delta);
  const p = parseIsoDate(deadlineDate);
  return zonedWallTimeToIso(
    p.year,
    p.month,
    p.day,
    clock.hour,
    clock.minute,
    0,
    timezone,
  );
}

export function parseExplicitDeadline(
  text: string,
  contextDate: string | null,
  timezone: string = APP_TIMEZONE,
): string | null {
  const weekday = resolveWeekdayDeadline(text, contextDate, timezone);
  if (weekday) return weekday;

  const dated = text.match(
    /register by\s+([a-z]+ \d{1,2},?\s+\d{4})(?:\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)))?/i,
  );
  if (dated) {
    const ymd = parseMonthDayYear(dated[1]);
    if (!ymd) return null;
    const clock = parseClockTime(dated[2] ?? "11:59 p.m.") ?? {
      hour: 23,
      minute: 59,
    };
    return zonedWallTimeToIso(
      ymd.year,
      ymd.month,
      ymd.day,
      clock.hour,
      clock.minute,
      0,
      timezone,
    );
  }
  return null;
}
