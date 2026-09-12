import type { Itinerary } from "@/lib/types";
import { itineraryPlainSummary } from "@/lib/planner/build-itinerary";

export function RouteSummary({ plan }: { plan: Itinerary }) {
  return (
    <div className="rounded-[22px] bg-ink px-4 py-4 text-white">
      <p className="text-sm font-semibold">{itineraryPlainSummary(plan)}</p>
      {plan.estimated_savings_usd != null && (
        <p className="mt-1 text-xs text-white/70">
          Illustrated savings about ${plan.estimated_savings_usd}. {plan.savings_assumption}
        </p>
      )}
      {plan.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/75">
          {plan.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
