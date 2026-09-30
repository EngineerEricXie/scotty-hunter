import type { MealRoutePreview } from "@/lib/maps/meal-route";
import { getBuilding } from "@/lib/maps/buildings";

export function MealRouteDetails({
  preview,
  date,
}: {
  preview: MealRoutePreview;
  date: string;
}) {
  if (preview.status === "empty") return null;
  return (
    <section
      className="mb-4 rounded-xl border border-teal-800/20 bg-teal-50 p-3 text-sm"
      aria-label="Meal route details"
    >
      <h3 className="font-bold text-ink">Your meal path · {date}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">
        Preview follows mapped outdoor paths near each building. Building pins are
        approximate, not entrances; check access and crossings on site.
      </p>
      <ol className="mt-2 space-y-1">
        {preview.stops
          .filter((stop) => stop.kind !== "path" && stop.kind !== "via")
          .map((stop, index) => (
            <li key={`${stop.eventId ?? stop.kind}-${index}`}>
              <strong>
                {stop.kind === "start" ? "Start" : stop.order}.{" "}
                {getBuilding(stop.buildingId)?.short_name ?? stop.buildingId}
              </strong>
              {stop.title ? ` · ${stop.title}` : ""}
            </li>
          ))}
      </ol>
      {preview.diagnostics.length > 0 && (
        <div className="mt-2 text-xs leading-5 text-amber-950">
          <p className="font-bold">Unmapped legs are not drawn:</p>
          <ul className="list-disc pl-4">
            {preview.diagnostics.map((diagnostic, index) => (
              <li key={index}>
                {getBuilding(diagnostic.fromBuildingId)?.short_name ?? "Unknown venue"} →{" "}
                {getBuilding(diagnostic.toBuildingId)?.short_name ?? "Unknown venue"}:{" "}
                {diagnostic.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
