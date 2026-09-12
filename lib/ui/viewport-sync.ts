export const VIEWPORT_SYNC_EVENT = "scotty:viewport-sync";

export function syncAppViewportVars() {
  if (typeof window === "undefined") return;
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height ?? window.innerHeight);
  const offsetTop = Math.round(viewport?.offsetTop ?? 0);
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--app-offset-top", `${offsetTop}px`);
}

export function requestViewportSync() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  syncAppViewportVars();
  window.dispatchEvent(new Event(VIEWPORT_SYNC_EVENT));
}

export function scheduleViewportSync() {
  if (typeof window === "undefined") return;
  requestViewportSync();
  requestAnimationFrame(() => {
    requestViewportSync();
    window.setTimeout(requestViewportSync, 60);
    window.setTimeout(requestViewportSync, 320);
    window.setTimeout(requestViewportSync, 800);
  });
}
