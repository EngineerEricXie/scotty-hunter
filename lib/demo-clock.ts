import { APP_CONFIG, APP_TIMEZONE } from "@/lib/config";
import { addDaysIso, calendarDateInZone, parseIsoDate, zonedWallTimeToDate } from "@/lib/timezone";

/** Saturday judging clock. Morning so breakfast through dinner all still read as the same demo day. */
const DEMO_HOUR = 10;
const DEMO_MINUTE = 0;

export function demoToday(): string {
  if (APP_CONFIG.demoMode) return APP_CONFIG.demoDate;
  return calendarDateInZone(new Date());
}

export function demoTomorrow(): string {
  return addDaysIso(demoToday(), 1);
}

/** Stable "now" in demo mode so RSVP deadlines stay deterministic. */
export function demoNow(): Date {
  if (!APP_CONFIG.demoMode) return new Date();
  const { year, month, day } = parseIsoDate(APP_CONFIG.demoDate);
  return zonedWallTimeToDate(year, month, day, DEMO_HOUR, DEMO_MINUTE);
}

export function demoNowMs(): number {
  return demoNow().getTime();
}

export function demoClockLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(demoNow());
}


