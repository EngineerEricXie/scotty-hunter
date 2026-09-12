import type { Itinerary } from "@/lib/types";
import { itineraryPlainSummary } from "@/lib/planner/build-itinerary";

export function RouteSummary({ plan }: { plan: Itinerary }) {
  return (
    <div className="pixel-panel bg-ink px-4 py-4 text-gold">
      <p className="text-sm font-bold">{itineraryPlainSummary(plan)}</p>
      {plan.estimated_savings_usd != null && (
        <p className="mt-1 text-xs text-white/80">
          Illustrated savings about ${plan.estimated_savings_usd}. {plan.savings_assumption}
        </p>
      )}
      {plan.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/80">
          {plan.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
