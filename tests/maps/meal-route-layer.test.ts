import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MealRoutePreview } from "@/lib/maps/meal-route";
import { MealRouteLayer } from "@/components/map/MealRouteLayer";

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void) | void>,
  markers: 0,
  removed: 0,
}));
vi.mock("react", () => ({
  useEffect: (effect: () => (() => void) | void) => mocks.effects.push(effect),
}));
vi.mock("maplibre-gl", () => ({
  Marker: class {
    constructor() {
      mocks.markers++;
    }
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      mocks.removed++;
    }
  },
}));

function mapFixture() {
  const sources = new Map<string, { data: unknown; setData: (data: unknown) => void }>();
  const layers = new Map<string, Record<string, unknown>>();
  const listeners = new Map<string, () => void>();
  return {
    sources,
    layers,
    listeners,
    styleReady: true,
    getStyle() {
      return this.styleReady ? { version: 8 } : undefined;
    },
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.get(id),
    addSource: (id: string, source: { data: unknown }) =>
      sources.set(id, {
        data: source.data,
        setData(data) {
          this.data = data;
        },
      }),
    addLayer: (layer: Record<string, unknown> & { id: string }) =>
      layers.set(layer.id, layer),
    setLayoutProperty: (id: string, name: string, value: unknown) => {
      layers.get(id)![name] = value;
    },
    removeLayer: (id: string) => layers.delete(id),
    removeSource: (id: string) => sources.delete(id),
    on: (event: string, callback: () => void) => listeners.set(event, callback),
    off: (event: string) => listeners.delete(event),
  };
}
const preview: MealRoutePreview = {
  stops: [
    {
      kind: "start",
      order: 0,
      buildingId: "ghc",
      longitude: -79.9445696,
      latitude: 40.4435617,
      label: "START",
    },
  ],
  legs: [],
  diagnostics: [],
  status: "partial",
  accuracyNote: "approximate",
  lines: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { legIndex: 0 },
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [2, 2],
          ],
        },
      },
      {
        type: "Feature",
        properties: { legIndex: 2 },
        geometry: {
          type: "LineString",
          coordinates: [
            [5, 5],
            [6, 6],
          ],
        },
      },
    ],
  },
};
beforeEach(() => {
  mocks.effects.length = 0;
  mocks.markers = 0;
  mocks.removed = 0;
  vi.stubGlobal("document", {
    createElement: () => ({ className: "", textContent: "", setAttribute: vi.fn() }),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("meal route layer lifecycle", () => {
  it("renders separate safe legs without connecting missing portions and cleans up", () => {
    const map = mapFixture();
    MealRouteLayer({ map: map as unknown as MapLibreMap, preview, visible: true });
    const cleanup = mocks.effects[0]!();
    expect(map.sources.get("cmu-meal-route")?.data).toBe(preview.lines);
    expect(map.layers.get("cmu-meal-route-line")?.visibility).toBe("visible");
    expect(mocks.markers).toBe(1);
    cleanup?.();
    expect(map.sources.size).toBe(0);
    expect(map.layers.size).toBe(0);
    expect(map.listeners.size).toBe(0);
    expect(mocks.removed).toBe(1);
  });
  it("hides both route layers and the start marker when toggled off", () => {
    const map = mapFixture();
    MealRouteLayer({ map: map as unknown as MapLibreMap, preview, visible: false });
    const cleanup = mocks.effects[0]!();
    expect(map.layers.get("cmu-meal-route-line")?.visibility).toBe("none");
    expect(map.layers.get("cmu-meal-route-casing")?.visibility).toBe("none");
    expect(mocks.markers).toBe(0);
    cleanup?.();
  });
  it("rebuilds route layers after a map-style reload without duplicate markers", () => {
    const map = mapFixture();
    MealRouteLayer({ map: map as unknown as MapLibreMap, preview, visible: true });
    const cleanup = mocks.effects[0]!();
    map.layers.clear();
    map.sources.clear();
    map.listeners.get("style.load")!();
    expect(map.sources.size).toBe(1);
    expect(map.layers.size).toBe(2);
    expect(mocks.markers - mocks.removed).toBe(1);
    cleanup?.();
  });
  it("does not display a marker or line for an unavailable path", () => {
    const map = mapFixture();
    MealRouteLayer({
      map: map as unknown as MapLibreMap,
      preview: {
        ...preview,
        status: "unavailable",
        lines: { type: "FeatureCollection", features: [] },
      },
      visible: true,
    });
    const cleanup = mocks.effects[0]!();
    expect(map.layers.get("cmu-meal-route-line")?.visibility).toBe("none");
    expect(mocks.markers).toBe(0);
    cleanup?.();
  });
  it("waits safely for a serialized style and rebuilds once style.load arrives", () => {
    const map = mapFixture();
    map.styleReady = false;
    MealRouteLayer({ map: map as unknown as MapLibreMap, preview, visible: true });
    const cleanup = mocks.effects[0]!();
    expect(map.sources.size).toBe(0);
    map.listeners.get("style.load")!();
    expect(map.sources.size).toBe(0);
    map.styleReady = true;
    map.listeners.get("style.load")!();
    expect(map.sources.size).toBe(1);
    expect(mocks.markers).toBe(1);
    expect(map.listeners.has("data")).toBe(false);
    cleanup?.();
    expect(map.listeners.size).toBe(0);
  });
});
