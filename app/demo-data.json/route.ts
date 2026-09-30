import { LocalFixtureEventRepository } from "@/lib/db/local-fixture-repository";
import { applyCorpusBoost } from "@/lib/community/boost";

export const dynamic = "force-static";

/** Published fixture snapshot. No user information or live-source requests. */
export async function GET() {
  const repository = new LocalFixtureEventRepository();
  const events = applyCorpusBoost(await repository.listEvents({ include_none: true }));
  const sources = (await repository.listSources()).filter((source) => source.parser_type === "fixture");
  return Response.json({ events, sources, mode: "static-demo", date: "2026-09-12" });
}
