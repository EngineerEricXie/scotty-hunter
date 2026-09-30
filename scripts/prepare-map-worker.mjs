import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Keep MapLibre's separately shipped module worker and its imports same-origin. */
export async function prepareMapWorker(
  rootDir = root,
  packageDir = path.join(root, "node_modules/maplibre-gl"),
) {
  const target = path.join(rootDir, "public/vendor/maplibre");
  await mkdir(target, { recursive: true });
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    await copyFile(path.join(packageDir, "dist", file), path.join(target, file));
  }
  await copyFile(path.join(packageDir, "LICENSE.txt"), path.join(target, "LICENSE.txt"));
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareMapWorker();
}
