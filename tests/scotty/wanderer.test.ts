import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ScottyWanderer } from "@/components/map/ScottyWanderer";

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  setLngLat: vi.fn(),
  removeMarker: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
}));

vi.mock("maplibre-gl", () => ({
  Marker: class {
    setLngLat(point: [number, number]) {
      mocks.setLngLat(point);
      return this;
    }
    addTo() {
      return this;
    }
    setOffset() {
      return this;
    }
    remove() {
      mocks.removeMarker();
    }
  },
}));

vi.mock("@/lib/scotty/state", () => ({
  loadScotty: () => ({ name: "Scotty" }),
  onScottyChange: () => mocks.unsubscribe,
}));

function mountWanderer(reduced = false) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const image = { src: "" };
  const attributes = new Map<string, string>();
  const button = Object.assign(new EventTarget(), {
    type: "",
    className: "",
    title: "",
    innerHTML: "",
    dataset: {} as Record<string, string>,
    querySelector: () => image,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  });
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: vi.fn(() => button),
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", {
    matchMedia: () => media,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  const onClick = vi.fn();
  ScottyWanderer({ map: {} as MapLibreMap, lureBuildingIds: [], onClick });
  const cleanups = mocks.effects.map((effect) => effect());
  return {
    button,
    document,
    frames,
    onClick,
    attributes,
    setReduced(matches: boolean) {
      media.matches = matches;
      media.dispatchEvent(new Event("change"));
    },
    setHidden(hidden: boolean) {
      document.hidden = hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    frame(elapsed = 16) {
      now += elapsed;
      const pending = [...frames];
      frames.clear();
      for (const [, callback] of pending) callback(now);
    },
    cleanup() {
      for (const cleanup of cleanups) cleanup?.();
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effects.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Scotty companion motion lifecycle", () => {
  it("starts still with reduced motion, then follows preference changes without duplicate loops", () => {
    const view = mountWanderer(true);
    expect(view.frames.size).toBe(0);
    expect(view.button.dataset.walking).toBe("false");
    expect(mocks.setLngLat).toHaveBeenCalledTimes(1);
    view.setReduced(false);
    expect(view.frames.size).toBe(1);
    view.frame();
    expect(mocks.setLngLat).toHaveBeenCalledTimes(2);
    expect(view.button.dataset.walking).toBe("true");
    expect(view.frames.size).toBe(1);
    view.setReduced(false);
    expect(view.frames.size).toBe(1);
    view.setReduced(true);
    expect(view.frames.size).toBe(0);
    expect(view.button.dataset.walking).toBe("false");
    view.frame(60_000);
    expect(mocks.setLngLat).toHaveBeenCalledTimes(2);
    view.cleanup();
  });

  it("suspends background animation and cleans up callbacks, listeners, and the clickable marker", () => {
    const view = mountWanderer();
    expect(view.document.createElement).toHaveBeenCalledWith("button");
    expect(view.button.type).toBe("button");
    expect(view.attributes.get("aria-label")).toBe("Scotty wandering campus");
    expect(view.button.title).toBe("Campus companion animation");
    view.button.dispatchEvent(new Event("click"));
    expect(view.onClick).toHaveBeenCalledTimes(1);
    view.setHidden(true);
    expect(view.frames.size).toBe(0);
    expect(view.button.dataset.walking).toBe("false");
    view.frame(3_600_000);
    view.setHidden(false);
    expect(view.frames.size).toBe(1);
    view.frame();
    expect(mocks.setLngLat).toHaveBeenCalledTimes(2);
    expect(view.frames.size).toBe(1);
    view.cleanup();
    expect(view.frames.size).toBe(0);
    expect(mocks.removeMarker).toHaveBeenCalledOnce();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    view.setReduced(true);
    view.setReduced(false);
    view.setHidden(false);
    view.button.dispatchEvent(new Event("click"));
    expect(view.frames.size).toBe(0);
    expect(view.onClick).toHaveBeenCalledTimes(1);
  });
});
