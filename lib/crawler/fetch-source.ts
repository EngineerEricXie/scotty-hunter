export interface FetchResult {
  ok: boolean;
  status: number;
  url: string;
  fetchedAt: string;
  contentType: string | null;
  body: string;
  error: string | null;
}

const TIMEOUT_MS = 12_000;
const USER_AGENT =
  "ScottyBites/0.1 (+https://github.com/scottybites; campus public-event research; contact: local-demo)";

export async function fetchPublicHtml(url: string): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    const body = decodeBody(buffer, contentType);
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      fetchedAt,
      contentType,
      body,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      fetchedAt,
      contentType: null,
      body: "",
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

function decodeBody(buffer: Buffer, contentType: string | null): string {
  const charsetMatch = contentType?.match(/charset=([^;]+)/i);
  const charset = charsetMatch?.[1]?.trim().toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
}
