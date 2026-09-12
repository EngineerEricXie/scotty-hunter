import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventRepository } from "@/lib/db";
import { applyCorpusBoost } from "@/lib/community/boost";
import { getBuilding } from "@/lib/maps/buildings";
import { foodStatusLabel } from "@/lib/extraction/classify-food";
import { formatTimeRange } from "@/lib/timezone";
import { BottomNav } from "@/components/ui/BottomNav";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getEventRepository();
  const found = await repo.getEvent(id);
  if (!found) notFound();
  const event =
    applyCorpusBoost(await repo.listEvents({ include_none: true })).find((item) => item.id === id) ??
    found;
  const building = getBuilding(event.building_id);

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="text-sm font-bold text-gold">
          ← MAP
        </Link>
        <div className="pixel-panel mt-3 bg-card p-4">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {formatTimeRange(event.start_time, event.end_time)} ·{" "}
            {building?.name ?? "Unresolved"} {event.room}
          </p>
          <blockquote className="mt-5 border-4 border-ink bg-[#fffaf0] p-4">
            <p className="font-bold">
              {foodStatusLabel(event.food_status)} ·{" "}
              {Math.round(event.food_confidence * 100)}% probability
            </p>
            <p className="mt-2 text-sm text-muted">
              {event.food_evidence ? `“${event.food_evidence}”` : "No food evidence."}
            </p>
            {event.boost_reasons && event.boost_reasons.length > 0 && (
              <p className="mt-2 text-xs font-bold text-sage">
                Boosted by: {event.boost_reasons.join(" · ")}
              </p>
            )}
          </blockquote>
          <p className="mt-4 text-sm leading-6 text-muted">{event.description}</p>
          <p className="mt-4 text-xs text-muted">{event.provenance_note}</p>
        </div>
      </main>
      <BottomNav current="/" />
    </div>
  );
}
