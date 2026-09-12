import { NextResponse } from "next/server";
import { getFoodVisionService } from "@/lib/vision/food-vision";
import { APP_CONFIG } from "@/lib/config";
import { z } from "zod";

const Body = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  eventId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload metadata" }, { status: 400 });
  }
  if (!parsed.data.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed." }, { status: 400 });
  }
  if (parsed.data.size > APP_CONFIG.maxUploadBytes) {
    return NextResponse.json({ error: "File too large." }, { status: 400 });
  }
  const vision = getFoodVisionService();
  const result = await vision.analyze({
    fileName: parsed.data.name,
    byteLength: parsed.data.size,
    mime: parsed.data.type,
    eventId: parsed.data.eventId,
  });
  return NextResponse.json({
    ...result,
    note: result.hiddenMenu
      ? "Table photo matched a hidden menu the public listing omitted."
      : "Mock food labels. Real vision APIs are deferred until a provider key exists.",
  });
}
