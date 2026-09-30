const PIN_VISIBILITY_KEY = "scottybites:map-event-pins";
const PIN_VISIBILITY_EVENT = "scottybites:map-event-pins-change";
let memoryVisibility = true;
let memoryOnly = false;

/** Pins start on; an explicit choice survives reloads when storage is available. */
export function loadPinVisibility(): boolean {
  if (typeof window === "undefined") return true;
  if (memoryOnly) return memoryVisibility;
  try {
    const saved = window.localStorage.getItem(PIN_VISIBILITY_KEY);
    memoryVisibility = saved !== "false";
    return memoryVisibility;
  } catch {
    memoryOnly = true;
    return memoryVisibility;
  }
}

export function savePinVisibility(visible: boolean): void {
  memoryVisibility = visible;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_VISIBILITY_KEY, String(visible));
    memoryOnly = false;
  } catch {
    memoryOnly = true;
    // The switch still works for this session in private/storage-blocked browsers.
  }
  window.dispatchEvent(new Event(PIN_VISIBILITY_EVENT));
}

export function subscribePinVisibility(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PIN_VISIBILITY_KEY || event.key === null) {
      memoryOnly = false;
      onChange();
    }
  };
  window.addEventListener(PIN_VISIBILITY_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PIN_VISIBILITY_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function defaultPinVisibility(): boolean {
  return true;
}
