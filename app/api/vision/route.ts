import { NextResponse } from "next/server";
import { APP_CONFIG, hasGrokCredentials, SERVER_CONFIG } from "@/lib/config";
import { getFoodVisionService } from "@/lib/vision/food-vision";
import { z } from "zod";

const JsonBody = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  eventId: z.string().nullable().optional(),
  imageBase64: z.string().min(1).optional(),
});

function toDataUrl(raw: string, mime: string): string {
  if (raw.startsWith("data:")) return raw;
  return `data:${mime};base64,${raw}`;
}

function visionMeta() {
  return {
    vision_ready: hasGrokCredentials(),
    provider: hasGrokCredentials() ? "grok" : "mock",
    model: hasGrokCredentials() ? SERVER_CONFIG.grokVisionModel : null,
  };
}

export async function GET() {
  return NextResponse.json(visionMeta());
}

export async function POST(request: Request) {
  try {
    const parsed = await readVisionRequest(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const vision = getFoodVisionService();
    const result = await vision.analyze({
      fileName: parsed.name,
      byteLength: parsed.size,
      mime: parsed.type,
      eventId: parsed.eventId,
      imageDataUrl: parsed.imageDataUrl,
    });

    const note = result.hiddenMenu
      ? result.provider === "grok"
        ? "Grok recognized a food table and unlocked dishes the public listing omitted."
        : "Table photo matched a hidden menu the public listing omitted."
      : result.provider === "grok"
        ? "Grok labeled the photo."
        : "Mock food labels. Add GROK_API to .env.local for real vision.";

    return NextResponse.json({
      ...result,
      note,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: hasGrokCredentials()
          ? "Grok could not read that photo."
          : "Could not scan that photo.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 },
    );
  }
}

async function readVisionRequest(request: Request): Promise<
  | {
      ok: true;
      name: string;
      size: number;
      type: string;
      eventId: string | null;
      imageDataUrl: string | null;
    }
  | { ok: false; error: string }
> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const eventIdRaw = form.get("eventId");
    const eventId = typeof eventIdRaw === "string" && eventIdRaw.length > 0 ? eventIdRaw : null;
    if (!(file instanceof Blob)) {
      return { ok: false, error: hasGrokCredentials() ? "Photo bytes are required." : "Invalid upload." };
    }
    const type = file.type || "image/jpeg";
    if (!type.startsWith("image/")) {
      return { ok: false, error: "Only images are allowed." };
    }
    if (file.size > APP_CONFIG.maxUploadBytes) {
      return { ok: false, error: "File too large." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = "name" in file && typeof file.name === "string" ? file.name : "upload.jpg";
    return {
      ok: true,
      name,
      size: file.size,
      type,
      eventId,
      imageDataUrl: toDataUrl(bytes.toString("base64"), type === "image/jpg" ? "image/jpeg" : type),
    };
  }

  const parsed = JsonBody.safeParse(await request.json());
  if (!parsed.success) {
    return { ok: false, error: "Invalid upload metadata" };
  }
  if (!parsed.data.type.startsWith("image/")) {
    return { ok: false, error: "Only images are allowed." };
  }
  if (parsed.data.size > APP_CONFIG.maxUploadBytes) {
    return { ok: false, error: "File too large." };
  }
  if (hasGrokCredentials() && !parsed.data.imageBase64) {
    return { ok: false, error: "Photo bytes are required for Grok vision." };
  }
  return {
    ok: true,
    name: parsed.data.name,
    size: parsed.data.size,
    type: parsed.data.type,
    eventId: parsed.data.eventId ?? null,
    imageDataUrl: parsed.data.imageBase64
      ? toDataUrl(parsed.data.imageBase64, parsed.data.type)
      : null,
  };
}
