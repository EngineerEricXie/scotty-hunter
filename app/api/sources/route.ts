import { NextResponse } from "next/server";
import { getEventRepository, repositoryMode } from "@/lib/db";

export async function GET() {
  const repo = getEventRepository();
  const sources = await repo.listSources();
  return NextResponse.json({
    repository: repositoryMode(),
    sources,
  });
}
