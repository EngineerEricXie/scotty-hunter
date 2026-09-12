import type { Event, RequiredAction } from "@/lib/types";
import { addDaysIso, calendarDateInZone } from "@/lib/timezone";
import { APP_TIMEZONE } from "@/lib/config";

export function classifyDeadlineWhen(
  deadlineIso: string,
  today: string,
  now = new Date(),
): RequiredAction["when"] {
  if (new Date(deadlineIso).getTime() < now.getTime()) return "overdue";
  const day = calendarDateInZone(new Date(deadlineIso), APP_TIMEZONE);
  if (day === today) return "today";
  if (day === addDaysIso(today, 1)) return "tomorrow";
  return "later";
}

export function requiredActionsForEvents(
  events: Event[],
  today: string,
  now = new Date(),
): RequiredAction[] {
  const actions: RequiredAction[] = [];
  for (const event of events) {
    if (!event.registration_required || !event.registration_deadline) continue;
    const when = classifyDeadlineWhen(event.registration_deadline, today, now);
    actions.push({
      when,
      title:
        when === "overdue"
          ? `Deadline passed: ${event.title}`
          : when === "today"
            ? `Register for ${event.title} today`
            : when === "tomorrow"
              ? `Registration closes tomorrow for ${event.title}`
              : `Register for ${event.title}`,
      deadline: event.registration_deadline,
      event_id: event.id,
      event_title: event.title,
      registration_url: event.registration_url,
    });
  }
  const order = { overdue: 0, today: 1, tomorrow: 2, later: 3 };
  return actions.sort((a, b) => {
    if (order[a.when] !== order[b.when]) return order[a.when] - order[b.when];
    return a.deadline.localeCompare(b.deadline);
  });
}
