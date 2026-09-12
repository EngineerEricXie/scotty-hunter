import type { FoodStatus } from "@/lib/types";
import { foodStatusLabel } from "@/lib/extraction/classify-food";

export function FoodConfidenceBadge({
  status,
  confidence,
  boosted,
}: {
  status: FoodStatus;
  confidence: number;
  boosted?: boolean;
}) {
  const pct = Math.round(confidence * 100);
  const tone =
    status === "EXPLICIT"
      ? "bg-[#d7f5de]"
      : status === "LIKELY"
        ? "bg-[#ffe08a]"
        : status === "POSSIBLE"
          ? "bg-[#e8e0d0]"
          : "bg-[#e8e0d0]";
  return (
    <span className={`inline-flex min-h-8 items-center border-4 border-ink px-2 text-xs font-bold ${tone}`}>
      {foodStatusLabel(status)}
      {status !== "NONE" ? ` · ${pct}%` : ""}
      {boosted ? " ↑" : ""}
    </span>
  );
}
