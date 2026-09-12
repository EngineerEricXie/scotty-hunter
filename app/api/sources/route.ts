import { NextResponse } from "next/server";
import { hasGrokCredentials, SERVER_CONFIG } from "@/lib/config";
import { getEventRepository, repositoryMode } from "@/lib/db";
import { canUseLlmExtractor } from "@/lib/extraction/llm-extractor";

export async function GET() {
  const repo = getEventRepository();
  const sources = await repo.listSources();
  const llmActive = canUseLlmExtractor();
  return NextResponse.json({
    repository: repositoryMode(),
    extraction: {
      provider: SERVER_CONFIG.extractionProvider,
      active: llmActive,
      model: llmActive ? SERVER_CONFIG.openaiModel : null,
      endpoint: llmActive ? SERVER_CONFIG.openaiBaseUrl : null,
    },
    grok: {
      ready: hasGrokCredentials(),
      chatModel: hasGrokCredentials() ? SERVER_CONFIG.grokModel : null,
      visionModel: hasGrokCredentials() ? SERVER_CONFIG.grokVisionModel : null,
      endpoint: hasGrokCredentials() ? SERVER_CONFIG.grokBaseUrl : null,
    },
    sources,
  });
}
