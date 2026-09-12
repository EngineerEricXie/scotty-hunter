"use client";

export function FloorSelector({
  buildingId,
  floor,
}: {
  buildingId: string | null;
  floor: string | null;
}) {
  if (buildingId !== "ghc") return null;
  const floors = ["9", "8", "7", "6", "5", "4", "3"];
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Indoor floors (scaffold)
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {floors.map((item) => (
          <span
            key={item}
            className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-semibold ${
              floor === item ? "bg-ink text-white" : "bg-canvas text-muted"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        Outdoor campus map is the source of truth. Indoor geometry is not fabricated.
      </p>
    </div>
  );
}
