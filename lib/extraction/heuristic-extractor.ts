import { APP_TIMEZONE } from "@/lib/config";
import { classifyFood } from "@/lib/extraction/classify-food";
import type { EventExtraction } from "@/lib/extraction/event-schema";
import {
  parseExplicitDeadline,
  parseMonthDayYear,
  parseTimeRangeText,
  isoFromYmd,
} from "@/lib/extraction/normalize-time";

export interface ExtractionInput {
  sourceUrl: string;
  title: string;
  text: string;
  timezone?: string;
  sourceDateContext?: string | null;
}

export interface EventExtractor {
  readonly name: string;
  extract(input: ExtractionInput): Promise<EventExtraction[]>;
}

const TIME_LINE =
  /^\s*(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2})(?:\s*(?:–|-|—|to|until)\s*(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\d{1,2}:\d{2}))?\s*$/i;

function isDateHeading(line: string): boolean {
  if (parseMonthDayYear(line)) return true;
  return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday),/i.test(
    line.trim(),
  );
}

function extractLinks(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
}

function looksLikeOrganizer(line: string): boolean {
  return /^organizer:\s*/i.test(line) || /^hosted by\s+/i.test(line);
}

/**
 * Deterministic, no-key extractor. Parses date headings + time-range blocks
 * and classifies food with heuristics. Never invents missing dates.
 */
export class HeuristicEventExtractor implements EventExtractor {
  readonly name: string = "heuristic-v1";

  async extract(input: ExtractionInput): Promise<EventExtraction[]> {
    const timezone = input.timezone ?? APP_TIMEZONE;
    const lines = input.text
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^=+\s*|\s*=+$/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((line) => line.length > 0);

    const events: EventExtraction[] = [];
    let currentDate = input.sourceDateContext ?? null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const headingDate = parseMonthDayYear(line);
      if (headingDate) {
        currentDate = isoFromYmd(
          headingDate.year,
          headingDate.month,
          headingDate.day,
        );
        i += 1;
        continue;
      }

      if (!TIME_LINE.test(line)) {
        i += 1;
        continue;
      }

      const timeLine = line;
      const title = lines[i + 1] && !TIME_LINE.test(lines[i + 1]) && !isDateHeading(lines[i + 1])
        ? lines[i + 1]
        : input.title || "Untitled event";

      const body: string[] = [];
      let j = i + 2;
      while (
        j < lines.length &&
        !TIME_LINE.test(lines[j]) &&
        !isDateHeading(lines[j])
      ) {
        body.push(lines[j]);
        j += 1;
      }

      const blockText = [title, ...body, timeLine].join("\n");
      const parsed = parseTimeRangeText(`${currentDate ?? ""} ${timeLine}`, {
        defaultDate: currentDate,
        timezone,
      });

      let organizer: string | null = null;
      let venueRaw: string | null = null;
      const descriptionParts: string[] = [];

      for (const raw of body) {
        if (looksLikeOrganizer(raw)) {
          organizer = raw.replace(/^(organizer:|hosted by)\s*/i, "").trim();
          continue;
        }
        if (
          !venueRaw &&
          /(?:ghc|gates|tepper|cuc|wean|doherty|hunt|nsh|hamburg|rangos|simmons|hall|center|quad|auditorium|room)\b/i.test(
            raw,
          ) &&
          !/^https?:/i.test(raw)
        ) {
          venueRaw = raw.replace(/^venue:\s*/i, "").trim();
          continue;
        }
        descriptionParts.push(raw);
      }

      const description = descriptionParts.join(" ").trim() || null;
      const food = classifyFood(blockText);
      const links = extractLinks(blockText);
      const required =
        /registration required|rsvp required|please rsvp|register to attend/i.test(
          blockText,
        ) || null;
      const deadline = parseExplicitDeadline(blockText, currentDate, timezone);

      const incompleteReasons = [...parsed.incompleteReasons];
      if (!parsed.startIso) incompleteReasons.push("unresolved_start");

      events.push({
        title: title.trim(),
        description,
        organizer,
        startTime: parsed.startIso,
        endTime: parsed.endIso,
        venueRaw,
        room: null,
        food: {
          status: food.status,
          types: food.types,
          items: food.items,
          cuisineTags: food.cuisine_tags,
          dietaryTags: food.dietary_tags,
          confidence: food.confidence,
          evidence: food.evidence,
        },
        registration: {
          required,
          url: links[0] ?? null,
          deadline,
        },
        incomplete: incompleteReasons.length > 0,
        incompleteReasons,
      });

      i = j;
    }

    return events;
  }
}

export class FixtureEventExtractor extends HeuristicEventExtractor {
  readonly name = "fixture-heuristic-v1";
}

export function getLocalExtractor(): EventExtractor {
  return new HeuristicEventExtractor();
}
