import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareMapWorker } from "../../scripts/prepare-map-worker.mjs";

describe("same-origin MapLibre worker assets", () => {
  it("copies the locked worker, its shared module, and license without rewriting vendor code", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "scotty-worker-"));
    const source = path.resolve("node_modules/maplibre-gl");
    try {
      const target = await prepareMapWorker(root, source);
      for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
        expect(await readFile(path.join(target, name), "utf8")).toBe(
          await readFile(path.join(source, "dist", name), "utf8"),
        );
      }
      expect(
        await readFile(path.join(target, "maplibre-gl-worker.mjs"), "utf8"),
      ).toContain("./maplibre-gl-shared.mjs");
      expect(await readFile(path.join(target, "LICENSE.txt"), "utf8")).toContain(
        "Redistribution",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
