import { NextResponse } from "next/server";
import { z } from "zod";
import { parsePreferenceUtterance } from "@/lib/personalization/parse-utterance";
import { DEFAULT_PREFERENCES } from "@/lib/storage/local-state";
import { getPreferenceAgentMeta } from "@/lib/llm/chat";
import type { UserPreference } from "@/lib/types";

const BodySchema = z.object({
  utterance: z.string().min(1).max(2000),
  current: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Say something the planner can use." }, { status: 400 });
    }
    const current = {
      ...DEFAULT_PREFERENCES,
      ...(parsed.data.current as Partial<UserPreference> | undefined),
    };
    const result = await parsePreferenceUtterance({
      utterance: parsed.data.utterance,
      current,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not parse preferences.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const agent = getPreferenceAgentMeta();
  return NextResponse.json({
    agent_ready: agent.ready,
    provider: agent.provider,
    model: agent.model,
  });
}
