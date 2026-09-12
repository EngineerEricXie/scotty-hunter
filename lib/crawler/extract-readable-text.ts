import * as cheerio from "cheerio";

export interface ReadableDocument {
  sourceUrl: string;
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

const NOISE = new Set([
  "nav",
  "footer",
  "header",
  "script",
  "style",
  "noscript",
  "svg",
  "form",
  "iframe",
]);

export function extractReadableText(
  html: string,
  sourceUrl: string,
): ReadableDocument {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();
  $("nav, footer, header, [role='navigation']").remove();

  const title =
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    sourceUrl;

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = safeUrl(href, sourceUrl);
    if (!abs) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) links.push({ href: abs, text });
  });

  const chunks: string[] = [];
  $("h1, h2, h3, h4, p, li, time, td, article, section").each((_, el) => {
    if (NOISE.has(el.tagName)) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) chunks.push(text);
  });

  const text = uniqueLines(chunks).join("\n");
  return { sourceUrl, title, text, links };
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function safeUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
