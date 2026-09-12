import type { Weekday } from "@/lib/types";
import { addDaysIso, parseIsoDate, zonedWallTimeToDate } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/config";

export function weekdayFromIso(isoDate: string): Weekday {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = zonedWallTimeToDate(year, month, day, 12, 0, 0, APP_TIMEZONE);
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: APP_TIMEZONE,
  })
    .format(date)
    .toLowerCase();
  return name as Weekday;
}

/** Next `horizon` calendar days from `fromDate` inclusive, matching campus days. */
export function upcomingCampusDates(
  fromDate: string,
  campusDays: Weekday[] | undefined,
  horizon = 7,
): string[] {
  const wanted = new Set((campusDays ?? []).map((day) => day.toLowerCase()));
  const dates: string[] = [];
  for (let i = 0; i < horizon; i += 1) {
    const date = addDaysIso(fromDate, i);
    if (wanted.size === 0) {
      if (i === 0) dates.push(date);
      continue;
    }
    if (wanted.has(weekdayFromIso(date))) dates.push(date);
  }
  if (dates.length === 0) return [fromDate];
  return dates;
}
