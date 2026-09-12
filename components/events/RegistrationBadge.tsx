import { relativeDeadline } from "@/lib/timezone";

export function RegistrationBadge({
  required,
  deadline,
}: {
  required: boolean;
  deadline: string | null;
}) {
  if (!required && !deadline) return null;
  return (
    <span className="inline-flex min-h-8 items-center rounded-full bg-tartan/10 px-3 text-xs font-semibold text-tartan">
      {required ? "RSVP required" : "Deadline"}
      {deadline ? ` · ${relativeDeadline(deadline)}` : ""}
    </span>
  );
}
