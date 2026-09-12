import { APP_CONFIG } from "@/lib/config";
import { addDaysIso, calendarDateInZone } from "@/lib/timezone";

export function demoToday(): string {
  if (APP_CONFIG.demoMode) return APP_CONFIG.demoDate;
  return calendarDateInZone(new Date());
}

export function demoTomorrow(): string {
  return addDaysIso(demoToday(), 1);
}
