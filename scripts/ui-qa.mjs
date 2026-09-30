import { chromium } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "qa"), { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};
(async () => {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(
      /^\/scotty-hunter\/?/,
      "",
    );
    let file = path.join(root, "out", name);
    if (!file.startsWith(path.join(root, "out"))) {
      res.writeHead(403);
      return res.end();
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    } catch {}
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("missing");
    }
    res.setHeader(
      "content-type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/scotty-hunter/`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.route("**/*", (route) =>
    route.request().url().startsWith("http://127.0.0.1:")
      ? route.continue()
      : route.abort(),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole("heading", { name: "On the menu" }).waitFor();
  await page.locator(".food-card").first().waitFor();
  await page.getByRole("application", { name: "Carnegie Mellon campus map" }).waitFor();
  await page.locator(".maplibregl-canvas").waitFor();
  if (
    await page
      .locator(".illustrated-map, .campus-illustration, .campus-world, .map-mode-toggle")
      .count()
  ) {
    throw new Error("Removed schematic map must not be rendered");
  }
  if (await page.getByRole("button", { name: "Illustrated map", exact: true }).count()) {
    throw new Error("Removed schematic map must not be selectable");
  }
  await page
    .getByText("Event pins hidden · Locations unverified", { exact: true })
    .waitFor();
  await page
    .getByText(
      "Street map unavailable. You can still browse the event list and use the planner.",
      { exact: true },
    )
    .waitFor();
  if (await page.locator(".food-marker, .route-start-marker").count()) {
    throw new Error(
      "Unavailable tiles must not leave a schematic-looking map of floating markers",
    );
  }
  await page.screenshot({ path: root + "/qa/desktop-explore.png" });
  console.log("Desktop rendered, event cards:", await page.locator(".food-card").count());
  await page.getByRole("textbox", { name: "Search food or events" }).fill("zzzz-no-food");
  await page.getByRole("heading", { name: "No bites just yet" }).waitFor();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await page.locator(".food-card").first().click();
  await page.getByLabel("Event details", { exact: true }).waitFor();
  await page.screenshot({ path: root + "/qa/desktop-event.png" });
  await page.getByRole("button", { name: "Close event details", exact: true }).click();
  await page.getByRole("button", { name: "My plan", exact: true }).click();
  await page.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
  await page.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).waitFor();
  await page.screenshot({ path: root + "/qa/desktop-plan.png" });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "ADD DAY TO CALENDAR (.ICS)", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs(root + "/qa/itinerary.ics");
  await page.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).click();
  if (!page.url().includes("/scotty-hunter/")) throw new Error("Lost base path");
  await page.getByRole("button", { name: "Scotty", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  console.log("ERRORS", JSON.stringify(errors));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: root + "/qa/mobile-explore.png" });
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.screenshot({ path: root + "/qa/mobile-list.png" });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  console.log("MOBILE_OVERFLOW", overflow);
  if (overflow.scroll > overflow.width) throw new Error("Mobile horizontal overflow");
  await page.locator(".food-card").first().click();
  await page.getByLabel("Event details", { exact: true }).waitFor();
  await page.screenshot({ path: root + "/qa/mobile-event.png" });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "UI PASS: street-map default, no schematic map or toggle, unverified-location notice, desktop/mobile, search empty/reset, details, demo itinerary, ICS export, overlay dismissal, base path, no runtime errors",
  );
  const noWebglPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  noWebglPage.on("pageerror", (error) => errors.push(error.message));
  await noWebglPage.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl")
        return null;
      return getContext.call(this, type, ...args);
    };
  });
  await noWebglPage.goto(url);
  await noWebglPage
    .getByText(
      "Street map unavailable. You can still browse the event list and use the planner.",
      { exact: true },
    )
    .waitFor();
  await noWebglPage.getByRole("button", { name: "List view", exact: true }).click();
  await noWebglPage.locator(".food-card").first().waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("WEBGL FALLBACK PASS: list remains usable, no runtime errors");

  // A separate live smoke check reports provider availability without making
  // deterministic interaction tests depend on third-party tile service uptime.
  const livePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  livePage.on("pageerror", (error) => errors.push(error.message));
  await livePage.goto(url);
  const liveTiles = await livePage
    .locator('[data-map-ready="true"]')
    .waitFor({ timeout: 30000 })
    .then(
      () => true,
      () => false,
    );
  if (liveTiles) {
    if (
      await livePage
        .locator(".food-marker, .route-start-marker, .map-route-button")
        .count()
    ) {
      throw new Error(
        "Unverified event pins and routes must not be rendered on the street map",
      );
    }
    await livePage.screenshot({ path: root + "/qa/desktop-street-map.png" });
    await livePage.setViewportSize({ width: 390, height: 844 });
    await livePage.screenshot({ path: root + "/qa/mobile-street-map.png" });
    console.log(
      "LIVE MAP PASS: external street tiles loaded; unverified event pins and routes absent",
    );
  } else {
    console.log(
      "LIVE MAP NOT VERIFIED: external tiles unavailable; offline fallback and local interactions passed",
    );
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
