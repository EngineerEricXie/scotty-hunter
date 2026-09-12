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
    <span className="inline-flex min-h-8 items-center border-4 border-ink bg-tartan px-2 text-xs font-bold text-gold">
      {required ? "RSVP" : "DEADLINE"}
      {deadline ? ` · ${relativeDeadline(deadline)}` : ""}
    </span>
  );
}
