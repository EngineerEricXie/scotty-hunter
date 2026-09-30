import { assetPath, IS_STATIC_DEMO } from "@/lib/runtime";

/** Run the static demo locally, or use the original server APIs when deployed with Next. */
export async function appFetch(path: string, init?: RequestInit): Promise<Response> {
  if (IS_STATIC_DEMO) {
    const { handleStaticRequest } = await import("@/lib/static-demo");
    return handleStaticRequest(path, init);
  }
  return fetch(assetPath(path), init);
}

export async function downloadEventCalendar(eventId: string): Promise<void> {
  const response = await appFetch(`/api/calendar?eventId=${encodeURIComponent(eventId)}`);
  if (!response.ok) throw new Error("Could not create the calendar file.");
  downloadBlob(await response.blob(), `${eventId}.ics`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Let the browser begin reading the blob before releasing it (including Safari).
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
