import { APP_CONFIG, APP_TIMEZONE } from "@/lib/config";
import { addDaysIso, calendarDateInZone, parseIsoDate, zonedWallTimeToDate } from "@/lib/timezone";

/** Saturday judging clock. Morning so breakfast through dinner all still read as the same demo day. */
const DEMO_HOUR = 10;
const DEMO_MINUTE = 0;
const CLOCK_KEY = "scottybites:demo-clock";

export const DEMO_CLOCK_EVENT = "scottybites:demo-clock";

export function isDemoClockActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLOCK_KEY) === "1";
}

export function frozenDemoNow(): Date {
  const { year, month, day } = parseIsoDate(APP_CONFIG.demoDate);
  return zonedWallTimeToDate(year, month, day, DEMO_HOUR, DEMO_MINUTE);
}

export function enableDemoClock() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOCK_KEY, "1");
  window.dispatchEvent(new Event(DEMO_CLOCK_EVENT));
}

export function disableDemoClock() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLOCK_KEY);
  window.dispatchEvent(new Event(DEMO_CLOCK_EVENT));
}

export function onDemoClockChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DEMO_CLOCK_EVENT, handler);
  return () => window.removeEventListener(DEMO_CLOCK_EVENT, handler);
}

function usesFrozenClock(): boolean {
  if (typeof window !== "undefined") return isDemoClockActive();
  return APP_CONFIG.demoMode;
}

export function demoToday(): string {
  if (usesFrozenClock()) return APP_CONFIG.demoDate;
  return calendarDateInZone(new Date());
}

export function demoTomorrow(): string {
  return addDaysIso(demoToday(), 1);
}

/** Live wall clock until RUN DEMO PLAN freezes judging time. */
export function demoNow(): Date {
  if (usesFrozenClock()) return frozenDemoNow();
  return new Date();
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
