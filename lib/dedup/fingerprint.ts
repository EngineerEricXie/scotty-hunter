export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function eventFingerprint(input: {
  title: string;
  startTime: string | null;
  organizer: string | null;
  buildingId: string | null;
  sourceUrl: string | null;
}): string {
  const parts = [
    normalizeTitle(input.title),
    input.startTime ?? "",
    (input.organizer ?? "").toLowerCase().trim(),
    input.buildingId ?? "",
    (input.sourceUrl ?? "").replace(/\/+$/, "").toLowerCase(),
  ];
  return parts.join("|");
}
