import { BUILDINGS } from "@/lib/maps/buildings";
import type { ResolvedLocation } from "@/lib/types";

interface AliasEntry {
  alias: string;
  buildingId: string;
}

const ALIAS_INDEX: AliasEntry[] = BUILDINGS.flatMap((building) =>
  [building.name, building.short_name, ...building.aliases].map((alias) => ({
    alias: normalizeAlias(alias),
    buildingId: building.id,
  })),
).sort((a, b) => b.alias.length - a.alias.length);

function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractRoom(text: string, buildingId: string | null): string | null {
  const stripped = text
    .replace(
      /\b(ghc|gates(?: hillman)?|tepper|tep|cuc|nsh|wean|weh|doherty|hunt|hamburg|hbh|posner|dh)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  const roomCode = stripped.match(/\b(?:room|rm\.?)?\s*(\d{3,4}[A-Z]?)\b/i);
  if (roomCode?.[1]) return roomCode[1].toUpperCase();

  const named = text.match(
    /\b(rangos(?: ballroom)?|simmons(?: auditorium)?|mcconaughy|connan|wright)\b/i,
  );
  if (named?.[1]) {
    const label = named[1].replace(/\s+/g, " ");
    return label.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (buildingId) {
    const after = text.match(
      /(?:ghc|gates|tepper|tep|cuc|nsh|wean|weh)\s+(\d{3,4}[A-Z]?)/i,
    );
    if (after?.[1]) return after[1].toUpperCase();
  }
  return null;
}

function floorFromRoom(room: string | null): string | null {
  if (!room) return null;
  const digits = room.match(/^(\d{3,4})/);
  if (!digits) return null;
  if (digits[1].length === 4) return digits[1][0] ?? null;
  if (digits[1].length === 3) return digits[1][0] ?? null;
  return null;
}

export function normalizeLocation(venueRaw: string | null | undefined): ResolvedLocation {
  const raw = (venueRaw ?? "").trim();
  if (!raw) {
    return {
      venue_raw: "",
      building_id: null,
      room: null,
      floor: null,
      resolution_confidence: 0,
    };
  }

  const normalized = normalizeAlias(raw);
  let buildingId: string | null = null;
  let confidence = 0;

  for (const entry of ALIAS_INDEX) {
    if (!entry.alias) continue;
    if (
      normalized === entry.alias ||
      normalized.startsWith(`${entry.alias} `) ||
      normalized.includes(` ${entry.alias} `) ||
      normalized.endsWith(` ${entry.alias}`)
    ) {
      buildingId = entry.buildingId;
      confidence = normalized === entry.alias ? 1 : 0.92;
      break;
    }
  }

  if (!buildingId) {
    for (const entry of ALIAS_INDEX) {
      if (entry.alias.length < 4) continue;
      if (normalized.includes(entry.alias)) {
        buildingId = entry.buildingId;
        confidence = 0.7;
        break;
      }
    }
  }

  const room = extractRoom(raw, buildingId);
  const floor = floorFromRoom(room);

  return {
    venue_raw: raw,
    building_id: buildingId,
    room,
    floor,
    resolution_confidence: buildingId ? (room ? Math.max(confidence, 0.88) : confidence) : 0,
  };
}
