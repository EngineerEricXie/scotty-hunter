import type { ParserType, Source, SourceType } from "@/lib/types";

const STAMP = "2026-09-01T00:00:00.000Z";

function source(partial: Omit<Source, "created_at" | "updated_at">): Source {
  return { ...partial, created_at: STAMP, updated_at: STAMP };
}

export const SOURCE_REGISTRY: Source[] = [
  source({
    id: "hackcmu-2026-fixture",
    name: "HackCMU 2026 Opening Ceremony (fixture)",
    base_url: "fixture://hackcmu-2026/opening-ceremony.txt",
    source_type: "pdf",
    parser_type: "fixture",
    enabled: true,
    crawl_interval_minutes: 1440,
    last_crawled_at: null,
    last_success_at: null,
    last_error: null,
    last_http_status: null,
    last_content_hash: null,
  }),
  source({
    id: "scottybites-demo-seed",
    name: "ScottyBites demo seed",
    base_url: "fixture://demo-seed",
    source_type: "manual",
    parser_type: "fixture",
    enabled: true,
    crawl_interval_minutes: 1440,
    last_crawled_at: null,
    last_success_at: null,
    last_error: null,
    last_http_status: null,
    last_content_hash: null,
  }),
  source({
    id: "cmu-events",
    name: "CMU Events (public)",
    base_url: "https://events.cmu.edu/",
    source_type: "official_calendar",
    parser_type: "html",
    enabled: true,
    crawl_interval_minutes: 180,
    last_crawled_at: null,
    last_success_at: null,
    last_error: null,
    last_http_status: null,
    last_content_hash: null,
  }),
  source({
    id: "scs-events",
    name: "School of Computer Science events (public)",
    base_url: "https://www.cs.cmu.edu/calendar",
    source_type: "department",
    parser_type: "html",
    enabled: true,
    crawl_interval_minutes: 180,
    last_crawled_at: null,
    last_success_at: null,
    last_error: null,
    last_http_status: null,
    last_content_hash: null,
  }),
];

export function getSource(id: string): Source | undefined {
  return SOURCE_REGISTRY.find((item) => item.id === id);
}

export function enabledSources(): Source[] {
  return SOURCE_REGISTRY.filter((item) => item.enabled);
}

export function describeSourceType(type: SourceType): string {
  return type.replaceAll("_", " ");
}

export function describeParser(type: ParserType): string {
  return type;
}
