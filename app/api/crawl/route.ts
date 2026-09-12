import { NextResponse } from "next/server";
import { crawlAll } from "@/lib/crawler/crawl-source";
import { enabledSources } from "@/lib/crawler/source-registry";
import { getEventRepository, repositoryMode } from "@/lib/db";

export async function POST() {
  const sources = enabledSources();
  const reports = await crawlAll(sources);
  const repo = getEventRepository();

  for (const report of reports) {
    await repo.updateSource(report.sourceId, {
      last_crawled_at: report.fetchedAt,
      last_success_at: report.ok ? report.fetchedAt : undefined,
      last_error: report.error,
      last_http_status: report.status,
      last_content_hash: report.contentHash ?? undefined,
    });
    if (report.ok && report.events.length > 0) {
      await repo.upsertEvents(report.events);
    }
  }

  return NextResponse.json({
    repository: repositoryMode(),
    note: "Live sources are best-effort. The demo never depends on them.",
    reports: reports.map((report) => ({
      sourceId: report.sourceId,
      ok: report.ok,
      status: report.status,
      error: report.error,
      eventCount: report.eventCount,
      usedFixture: report.usedFixture,
      skippedUnchanged: report.skippedUnchanged,
    })),
  });
}

export async function GET() {
  const repo = getEventRepository();
  const sources = await repo.listSources();
  return NextResponse.json({
    repository: repositoryMode(),
    sources,
  });
}
