import { extractEventsFromText } from "@/lib/extraction/extract-events";
import { extractReadableText } from "@/lib/crawler/extract-readable-text";
import { fetchPublicHtml } from "@/lib/crawler/fetch-source";
import { sha256 } from "@/lib/hash";
import type { Event, Source } from "@/lib/types";
import { HACKCMU_FIXTURE_TEXT } from "@/data/fixtures/hackcmu-2026/source";

export interface CrawlReport {
  sourceId: string;
  ok: boolean;
  status: number | null;
  error: string | null;
  contentHash: string | null;
  skippedUnchanged: boolean;
  eventCount: number;
  events: Event[];
  fetchedAt: string;
  usedFixture: boolean;
}

export async function crawlSource(
  source: Source,
  previousHash?: string | null,
): Promise<CrawlReport> {
  const fetchedAt = new Date().toISOString();

  if (source.parser_type === "fixture" || source.id === "hackcmu-2026-fixture") {
    return crawlFixture(source, fetchedAt);
  }

  const fetched = await fetchPublicHtml(source.base_url);
  if (!fetched.ok) {
    return {
      sourceId: source.id,
      ok: false,
      status: fetched.status,
      error: fetched.error,
      contentHash: null,
      skippedUnchanged: false,
      eventCount: 0,
      events: [],
      fetchedAt,
      usedFixture: false,
    };
  }

  const readable = extractReadableText(fetched.body, fetched.url);
  const contentHash = sha256(readable.text);
  if (previousHash && previousHash === contentHash) {
    return {
      sourceId: source.id,
      ok: true,
      status: fetched.status,
      error: null,
      contentHash,
      skippedUnchanged: true,
      eventCount: 0,
      events: [],
      fetchedAt,
      usedFixture: false,
    };
  }

  try {
    const events = await extractEventsFromText(
      {
        sourceUrl: fetched.url,
        title: readable.title,
        text: readable.text,
        sourceDateContext: null,
      },
      {
        sourceId: source.id,
        sourceType: source.source_type,
        provenanceNote: `Live public HTML fetch of ${fetched.url}. Extraction used the local heuristic extractor, not an LLM.`,
      },
    );
    return {
      sourceId: source.id,
      ok: true,
      status: fetched.status,
      error: null,
      contentHash,
      skippedUnchanged: false,
      eventCount: events.length,
      events,
      fetchedAt,
      usedFixture: false,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      ok: false,
      status: fetched.status,
      error: error instanceof Error ? error.message : "Extraction failed",
      contentHash,
      skippedUnchanged: false,
      eventCount: 0,
      events: [],
      fetchedAt,
      usedFixture: false,
    };
  }
}

async function crawlFixture(source: Source, fetchedAt: string): Promise<CrawlReport> {
  if (source.id !== "hackcmu-2026-fixture") {
    return {
      sourceId: source.id,
      ok: true,
      status: 200,
      error: null,
      contentHash: null,
      skippedUnchanged: false,
      eventCount: 0,
      events: [],
      fetchedAt,
      usedFixture: true,
    };
  }

  const events = await extractEventsFromText(
    {
      sourceUrl: source.base_url,
      title: "HackCMU 2026 Opening Ceremony",
      text: HACKCMU_FIXTURE_TEXT,
      sourceDateContext: "2026-09-11",
    },
    {
      sourceId: source.id,
      sourceType: "pdf",
      provenanceNote:
        "Deterministic fixture derived from HackCMU 2026 schedule text (not a live PDF scrape).",
    },
  );

  return {
    sourceId: source.id,
    ok: true,
    status: 200,
    error: null,
    contentHash: sha256(HACKCMU_FIXTURE_TEXT),
    skippedUnchanged: false,
    eventCount: events.length,
    events,
    fetchedAt,
    usedFixture: true,
  };
}

export async function crawlAll(sources: Source[]): Promise<CrawlReport[]> {
  const reports: CrawlReport[] = [];
  for (const source of sources) {
    try {
      reports.push(await crawlSource(source, source.last_content_hash));
    } catch (error) {
      reports.push({
        sourceId: source.id,
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "Source failed",
        contentHash: null,
        skippedUnchanged: false,
        eventCount: 0,
        events: [],
        fetchedAt: new Date().toISOString(),
        usedFixture: false,
      });
    }
  }
  return reports;
}
