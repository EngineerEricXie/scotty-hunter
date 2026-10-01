import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  campusFrameCoordinates,
  mapFramePadding,
  shouldFrameCampus,
} from "@/lib/maps/map-framing";
import { campusFootwayGraph } from "@/lib/maps/road-graph";

// Run the installed MapLibre camera/projection, without a browser or a fake
// linear projection. Bundling its TS sources avoids WebGL and worker setup.
type NativeCamera = {
  transform: { resize: (width: number, height: number, constrain: boolean) => void };
  cameraForBounds: (
    bounds: unknown,
    options: unknown,
  ) => { zoom: number; center: { lng: number; lat: number } } | undefined;
  jumpTo: (options: unknown) => void;
};
let native: {
  camera: () => NativeCamera;
  bounds: (points: [number, number][]) => unknown;
  project: (camera: NativeCamera, point: [number, number]) => { x: number; y: number };
};
let temp: string;
beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), "scotty-map-framing-"));
  const outfile = join(temp, "camera.cjs");
  buildSync({
    stdin: {
      contents: `
        import { Camera } from ${JSON.stringify(join(process.cwd(), "node_modules/maplibre-gl/src/ui/camera.ts"))};
        import { LngLatBounds } from ${JSON.stringify(join(process.cwd(), "node_modules/maplibre-gl/src/geo/lng_lat_bounds.ts"))};
        import { LngLat } from ${JSON.stringify(join(process.cwd(), "node_modules/maplibre-gl/src/geo/lng_lat.ts"))};
        export const camera = () => new Camera({maxZoom:22,minZoom:0,terrain:null,transformConstrain:null,requestRenderFrame:()=>0,cancelRenderFrame:()=>{},bearingSnap:0,zoomSnap:0,renderWorldCopies:false});
        export const bounds = points => { const result = new LngLatBounds(); for (const point of points) result.extend(point); return result; };
        export const project = (camera, point) => camera.transform.locationToScreenPoint(new LngLat(...point));
      `,
      resolveDir: process.cwd(),
      loader: "js",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    logLevel: "silent",
  });
  native = createRequire(import.meta.url)(outfile);
});
afterAll(() => rmSync(temp, { recursive: true, force: true }));

const sizes = [
  { width: 1026, height: 1000, top: 90, bottom: 144 },
  { width: 390, height: 844, top: 254, bottom: 206 },
  { width: 375, height: 667, top: 254, bottom: 206 },
  { width: 667, height: 375, top: 108, bottom: 62 },
  { width: 740, height: 360, top: 108, bottom: 62 },
  { width: 768, height: 485, top: 108, bottom: 62 },
  // A visible meal-route switch adds another short-layout bottom inset.
  { width: 740, height: 360, top: 108, bottom: 118 },
];
function assertFrame(camera: NativeCamera, size: (typeof sizes)[number]) {
  const padding = mapFramePadding(size.width, size.height, size);
  expect(size.width - padding.left - padding.right).toBeGreaterThan(0);
  expect(size.height - padding.top - padding.bottom).toBeGreaterThan(0);
  camera.transform.resize(size.width, size.height, true);
  const coordinates = campusFrameCoordinates();
  const fitted = camera.cameraForBounds(native.bounds(coordinates), {
    padding,
    bearing: 0,
    maxZoom: 16.9,
  });
  expect(fitted).toBeDefined();
  expect(Number.isFinite(fitted!.zoom)).toBe(true);
  expect(Number.isFinite(fitted!.center.lng)).toBe(true);
  expect(Number.isFinite(fitted!.center.lat)).toBe(true);
  camera.jumpTo({ ...fitted, pitch: 0 });
  for (const point of coordinates) {
    const { x, y } = native.project(camera, point);
    expect(x - 24).toBeGreaterThanOrEqual(-0.01);
    expect(x + 24).toBeLessThanOrEqual(size.width + 0.01);
    expect(y - 51).toBeGreaterThanOrEqual(size.top - 0.01);
    expect(y + 2).toBeLessThanOrEqual(size.height - size.bottom + 0.01);
  }
}

describe("campus framing with MapLibre's exact projection", () => {
  it("includes every mapped footway point, including the east/south roaming extremes", () => {
    const coordinates = campusFrameCoordinates();
    const keys = new Set(coordinates.map((point) => point.join(",")));
    for (const edge of campusFootwayGraph()) {
      for (const point of edge.points)
        expect(keys.has(`${point.longitude},${point.latitude}`)).toBe(true);
    }
    expect(Math.max(...coordinates.map((point) => point[0]))).toBeGreaterThanOrEqual(
      -79.939086,
    );
    expect(Math.min(...coordinates.map((point) => point[1]))).toBeLessThanOrEqual(
      40.440122,
    );
  });
  for (const size of sizes) {
    it(`keeps the full walking bbox and 48px mascot visible at ${size.width}x${size.height} (bottom ${size.bottom})`, () =>
      assertFrame(native.camera(), size));
  }
  it("reframes portrait-to-landscape-to-portrait on the same camera", () => {
    const camera = native.camera();
    for (const index of [1, 3, 4, 5, 1]) assertFrame(camera, sizes[index]!);
  });
  it("always leaves positive camera space during tiny or keyboard-resized layouts", () => {
    for (const width of [1, 44, 200, 390, 768]) {
      for (const height of [1, 44, 200, 360, 484, 485, 486]) {
        const padding = mapFramePadding(width, height, { top: 260, bottom: 225 });
        expect(width - padding.left - padding.right).toBeGreaterThan(0);
        expect(height - padding.top - padding.bottom).toBeGreaterThan(0);
      }
    }
  });
  it("retries an unsuccessful initial fit, skips unchanged layouts, and preserves user panning", () => {
    expect(shouldFrameCampus({ signature: null, userAdjusted: false }, "portrait")).toBe(
      true,
    );
    expect(
      shouldFrameCampus({ signature: "portrait", userAdjusted: false }, "portrait"),
    ).toBe(false);
    expect(
      shouldFrameCampus({ signature: "portrait", userAdjusted: false }, "landscape"),
    ).toBe(true);
    expect(
      shouldFrameCampus({ signature: "portrait", userAdjusted: true }, "landscape"),
    ).toBe(false);
  });
});
