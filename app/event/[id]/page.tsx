import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventRepository } from "@/lib/db";
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
  const event = await getEventRepository().getEvent(id);
  if (!event) notFound();
  const building = getBuilding(event.building_id);

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="text-sm font-semibold text-tartan">
          ← Map
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{event.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {formatTimeRange(event.start_time, event.end_time)} ·{" "}
          {building?.name ?? "Unresolved"} {event.room}
        </p>
        <blockquote className="mt-5 rounded-[22px] bg-white p-4">
          <p className="font-semibold">
            {foodStatusLabel(event.food_status)} ·{" "}
            {Math.round(event.food_confidence * 100)}% confidence
          </p>
          <p className="mt-2 text-sm text-muted">
            {event.food_evidence ? `“${event.food_evidence}”` : "No food evidence."}
          </p>
        </blockquote>
        <p className="mt-4 text-sm leading-6 text-muted">{event.description}</p>
        <p className="mt-4 text-xs text-muted">{event.provenance_note}</p>
      </main>
      <BottomNav current="/" />
    </div>
  );
}
