import type { FoodStatus } from "@/lib/types";
import { foodStatusLabel } from "@/lib/extraction/classify-food";

export function FoodConfidenceBadge({
  status,
  confidence,
}: {
  status: FoodStatus;
  confidence: number;
}) {
  const pct = Math.round(confidence * 100);
  const tone =
    status === "EXPLICIT"
      ? "bg-emerald-50 text-sage"
      : status === "LIKELY"
        ? "bg-amber-50 text-amber-800"
        : status === "POSSIBLE"
          ? "bg-slate-100 text-slate-600"
          : "bg-slate-100 text-muted";
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${tone}`}
    >
      {foodStatusLabel(status)}
      {status !== "NONE" ? ` · ${pct}%` : ""}
    </span>
  );
}
