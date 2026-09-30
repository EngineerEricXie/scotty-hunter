import { chromium, expect } from "@playwright/test";
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
  const url = "https://engineerericxie.github.io/scotty-hunter/";
  // Publication may still be propagating; the existing workflow timeout bounds this read-only wait.
  while (true) {
    try {
      const deployment = await (await fetch(`${url}deployment.json`)).json();
      if (deployment.source_commit === "98002a546c96786d8fd3a246f86e7089bd65c0a4") break;
    } catch { /* Try again when the deployment is available. */ }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
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
    new URL(route.request().url()).origin === new URL(url).origin
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
  await page.getByText("Demo events · Building-level pins", { exact: true }).waitFor();
  const pins = page.getByRole("switch", { name: "Event pins", exact: true });
  await expect(pins).toBeChecked();
  await pins.click();
  await expect(pins).not.toBeChecked();
  await page.reload();
  await expect(pins).not.toBeChecked();
  await pins.focus();
  await page.keyboard.press("Space");
  await expect(pins).toBeChecked();
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
    "UI PASS: street-map default, no schematic map, default-on pin switch with keyboard/persistence, desktop/mobile, search empty/reset, details, demo itinerary, ICS export, overlay dismissal, base path, no runtime errors",
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
    await livePage.locator(".food-marker").first().waitFor();
    const livePins = livePage.getByRole("switch", { name: "Event pins", exact: true });
    await expect(livePins).toBeChecked();
    await expect(livePage.locator('.food-marker[data-buildings="tepper"]')).toBeVisible();
    await expect(livePage.locator('.food-marker[data-buildings*="craig"]')).toHaveCount(
      0,
    );
    await expect(
      livePage.locator(".route-start-marker, .map-route-button, .illustrated-map"),
    ).toHaveCount(0);
    // Tile services may retain long-running requests; functional readiness was checked above.
    await livePage.waitForTimeout(1500);
    await livePage.screenshot({ path: root + "/qa/desktop-street-map.png" });

    await livePage.locator('.food-marker[data-buildings="tepper"]').click();
    await livePage.getByLabel("Overlapping food drops", { exact: true }).waitFor();
    await livePage
      .getByLabel("Overlapping food drops", { exact: true })
      .getByRole("button", { name: /AI Seminar: Grounded Campus Agents/ })
      .click();
    await livePage.getByLabel("Event details", { exact: true }).waitFor();
    await livePage
      .getByRole("button", { name: "Close event details", exact: true })
      .click();
    await livePins.click();
    await expect(livePage.locator(".food-marker")).toHaveCount(0);
    await livePage.reload();
    await expect(livePins).not.toBeChecked();
    await livePage.locator('[data-map-ready="true"]').waitFor();
    await expect(livePage.locator(".food-marker")).toHaveCount(0);
    await livePins.click();
    await livePage.locator(".food-marker").first().waitFor();

    const mascot = livePage.locator(".scotty-wanderer");
    await mascot.waitFor();
    const initialPosition = await mascot.evaluate((el) => el.style.transform);
    await livePage.waitForFunction(
      (position) =>
        Boolean(document.querySelector(".scotty-wanderer")) &&
        document.querySelector(".scotty-wanderer").style.transform !== position,
      initialPosition,
      { timeout: 8000 },
    );
    await livePage.emulateMedia({ reducedMotion: "reduce" });
    await expect(mascot).toHaveAttribute("data-walking", "false");
    const pausedPosition = await mascot.evaluate((el) => el.style.transform);
    await livePage.waitForTimeout(500);
    expect(await mascot.evaluate((el) => el.style.transform)).toBe(pausedPosition);
    await livePage.emulateMedia({ reducedMotion: "no-preference" });
    await livePage.waitForFunction(
      (position) =>
        Boolean(document.querySelector(".scotty-wanderer")) &&
        document.querySelector(".scotty-wanderer").style.transform !== position,
      pausedPosition,
      { timeout: 8000 },
    );

    const mobileMap = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobileMap.on("pageerror", (error) => errors.push(error.message));
    await mobileMap.goto(url);
    await mobileMap.locator(".food-marker").first().waitFor();
    const mobilePins = mobileMap.getByRole("switch", { name: "Event pins", exact: true });
    await expect(mobilePins).toBeVisible();
    await expect(mobilePins).toBeChecked();
    await mobileMap.waitForTimeout(1500);
    for (const marker of await mobileMap.locator(".food-marker").all()) {
      const box = await marker.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y).toBeGreaterThanOrEqual(212);
    }
    await mobileMap.screenshot({ path: root + "/qa/mobile-street-map.png" });
    await mobilePins.click();
    await expect(mobileMap.locator(".food-marker")).toHaveCount(0);
    await mobilePins.click();
    await mobileMap.locator(".food-marker").first().waitFor();
    expect(
      await mobileMap.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    console.log(
      "LIVE MAP PASS: default-on verified building pins, toggle/keyboard/persistence, marker details, mobile toggle, mascot movement and dynamic reduced-motion pause/resume",
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
