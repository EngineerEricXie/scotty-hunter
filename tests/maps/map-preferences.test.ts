import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "scottybites:map-event-pins";
let saved: Map<string, string>;
let testWindow: EventTarget & {
  localStorage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.resetModules();
  saved = new Map();
  testWindow = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: vi.fn((key: string) => saved.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => saved.set(key, value)),
    },
  });
  vi.stubGlobal("window", testWindow);
});
afterEach(() => vi.unstubAllGlobals());

describe("event pin visibility", () => {
  it("is on by default and honors a saved off choice", async () => {
    const prefs = await import("@/lib/maps/map-preferences");
    expect(prefs.loadPinVisibility()).toBe(true);
    saved.set(KEY, "false");
    expect(prefs.loadPinVisibility()).toBe(false);
    expect(prefs.defaultPinVisibility()).toBe(true);
  });

  it("notifies the current tab and persists both repeated switch directions", async () => {
    const prefs = await import("@/lib/maps/map-preferences");
    const changed = vi.fn();
    const unsubscribe = prefs.subscribePinVisibility(changed);
    prefs.savePinVisibility(false);
    expect(prefs.loadPinVisibility()).toBe(false);
    expect(saved.get(KEY)).toBe("false");
    prefs.savePinVisibility(true);
    expect(prefs.loadPinVisibility()).toBe(true);
    expect(saved.get(KEY)).toBe("true");
    expect(changed).toHaveBeenCalledTimes(2);
    unsubscribe();
    prefs.savePinVisibility(false);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("still toggles when local storage reads or writes are blocked", async () => {
    const prefs = await import("@/lib/maps/map-preferences");
    testWindow.localStorage.setItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    prefs.savePinVisibility(false);
    expect(prefs.loadPinVisibility()).toBe(false);
    testWindow.localStorage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    prefs.savePinVisibility(true);
    expect(prefs.loadPinVisibility()).toBe(true);
  });

  it("reacts to another tab changing or clearing the preference", async () => {
    const prefs = await import("@/lib/maps/map-preferences");
    const changed = vi.fn();
    const unsubscribe = prefs.subscribePinVisibility(changed);
    saved.set(KEY, "false");
    testWindow.dispatchEvent(Object.assign(new Event("storage"), { key: KEY }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(prefs.loadPinVisibility()).toBe(false);
    saved.clear();
    testWindow.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    expect(prefs.loadPinVisibility()).toBe(true);
    unsubscribe();
  });
});
