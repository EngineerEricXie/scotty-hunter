import { cp, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareMapWorker } from "./prepare-map-worker.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await prepareMapWorker(root);
const stage = await mkdtemp(path.join(tmpdir(), "scotty-pages-"));

// Build a clean static target: never move, delete or rewrite the working server routes.
// Do not copy .env files, credentials, repository metadata, or uploaded data.
try {
  for (const name of [
    "app",
    "components",
    "lib",
    "data",
    "public",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "package.json",
    "package-lock.json",
  ]) {
    await cp(path.join(root, name), path.join(stage, name), {
      recursive: true,
      filter: (source) => source !== path.join(root, "app", "api"),
    });
  }
  await symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), "dir");
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
      {
        cwd: stage,
        stdio: "inherit",
        env: {
          ...process.env,
          STATIC_EXPORT: "true",
          NEXT_PUBLIC_STATIC_DEMO: "true",
          NEXT_PUBLIC_DEMO_MODE: "true",
          NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH ?? "/scotty-hunter",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
    );
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (exitCode !== 0) throw new Error(`Static build exited with code ${exitCode}`);
  await rm(path.join(root, "out"), { recursive: true, force: true });
  await mkdir(path.join(root, "out"), { recursive: true });
  await cp(path.join(stage, "out"), path.join(root, "out"), { recursive: true });
  await writeFile(path.join(root, "out", ".nojekyll"), "");
  console.log("\nGitHub Pages demo ready in out/. Server API source was preserved.");
} finally {
  await rm(stage, { recursive: true, force: true });
}
