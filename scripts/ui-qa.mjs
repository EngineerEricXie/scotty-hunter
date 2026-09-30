import { chromium, expect as baseExpect } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qa = path.join(root, process.env.SCOTTY_QA_ARTIFACT_DIR || "qa");
fs.mkdirSync(qa, { recursive: true });
const expect = baseExpect.configure({ timeout: 15_000 });
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
  { name: "landscape-667", width: 667, height: 375 },
  { name: "landscape-740", width: 740, height: 360 },
  { name: "boundary-768", width: 768, height: 485 },
];
const unavailable =
  "Street map unavailable. You can still browse the event list and use the planner.";
const results = [];
// A real PNG, delivered as an isolated test tile. Functional map tests do not
// depend on a public tile server. The separate provider smoke uses real tiles.
const tilePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
const fixtureStyle = {
  version: 8,
  sources: {
    qa: {
      type: "raster",
      tiles: ["https://scotty-qa.invalid/tiles/{z}/{x}/{y}.png"],
      tileSize: 256,
    },
  },
  layers: [
    { id: "qa-background", type: "background", paint: { "background-color": "#e8ede2" } },
    { id: "qa-tile", type: "raster", source: "qa", paint: { "raster-opacity": 0.1 } },
  ],
};

function serveStatic() {
  const out = path.resolve(root, "out");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".txt": "text/plain",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
  };
  const server = http.createServer((req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, "http://local").pathname)
        .replace(/^\/scotty-hunter\/?/, "")
        .replace(/^\/+/, "");
      let file = path.resolve(out, name);
      if (file !== out && !file.startsWith(out + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      res.setHeader(
        "content-type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.end(fs.readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () =>
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}/scotty-hunter/`,
      }),
    );
  });
}

async function contextFor(browser, url, viewport, mode = "fixture") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const origin = new URL(url).origin;
  if (mode !== "live") {
    await page.route("**/*", (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === origin) return route.continue();
      if (mode === "offline") return route.abort();
      if (
        requestUrl.hostname === "scotty-qa.invalid" ||
        requestUrl.hostname === "tile.openstreetmap.org"
      ) {
        return route.fulfill({ status: 200, contentType: "image/png", body: tilePng });
      }
      if (/\/styles\//.test(requestUrl.pathname))
        return route.fulfill({ json: fixtureStyle });
      return route.abort();
    });
  }
  return { context, page, errors };
}

async function loaded(page, url, map = true) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("application", { name: "Carnegie Mellon campus map" }).waitFor();
  await expect(page.locator(".food-card")).not.toHaveCount(0);
  if (map) {
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 30_000 });
    await page.locator(".food-marker").first().waitFor();
    await page.locator(".scotty-wanderer").waitFor();
  }
  await expect(
    page.locator(
      ".illustrated-map, .campus-illustration, .campus-world, .map-mode-toggle",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Illustrated map", exact: true }),
  ).toHaveCount(0);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(qa, `${name}.png`), animations: "disabled" });
}

async function noOverflow(page) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(size.scroll, "Page must not overflow horizontally").toBeLessThanOrEqual(
    size.width,
  );
}

async function control(page, locator, label, minimum = 44) {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} has a box`).not.toBeNull();
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(minimum - 0.1);
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(minimum - 0.1);
  const viewport = page.viewportSize();
  expect(box.x, `${label} left`).toBeGreaterThanOrEqual(-0.5);
  expect(box.y, `${label} top`).toBeGreaterThanOrEqual(-0.5);
  expect(box.x + box.width, `${label} right`).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y + box.height, `${label} bottom`).toBeLessThanOrEqual(
    viewport.height + 0.5,
  );
  expect(
    await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit === el || el.contains(hit);
    }),
    `${label} is not covered by another control: ${JSON.stringify(
      await locator.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          hit: hit?.outerHTML.slice(0, 240),
        };
      }),
    )}`,
  ).toBe(true);
}

async function controls(page) {
  await noOverflow(page);
  await control(
    page,
    page.getByRole("switch", { name: "Event pins", exact: true }),
    "Event pins",
  );
  await control(page, page.getByRole("button", { name: /^Filters/ }), "Filters");
  for (const name of ["Explore", "My plan", "Scotty", "To-dos"]) {
    await control(page, page.getByRole("button", { name, exact: true }), name);
  }
  for (const selector of [
    ".maplibregl-ctrl-zoom-in",
    ".maplibregl-ctrl-zoom-out",
    ".maplibregl-ctrl-compass",
  ]) {
    await control(page, page.locator(selector), selector);
  }
  if (await page.locator(".mobile-view-toggle").isVisible())
    await control(page, page.locator(".mobile-view-toggle"), "Map/list toggle");
}

async function mapBounds(page) {
  const violations = await page.evaluate(() => {
    const map = document.querySelector(".campus-map-frame").getBoundingClientRect();
    const header = document.querySelector(".discovery-panel").getBoundingClientRect();
    const nav = document.querySelector('[aria-label="Primary"]').getBoundingClientRect();
    const top =
      header.width >= innerWidth - 2 ? Math.max(map.top, header.bottom) : map.top;
    const safe = {
      left: Math.max(0, map.left),
      right: Math.min(innerWidth, map.right),
      top,
      bottom: Math.min(innerHeight, nav.top),
    };
    return [...document.querySelectorAll(".food-marker, .scotty-wanderer")].flatMap(
      (el) => {
        const box = el.getBoundingClientRect();
        return box.left < safe.left - 1 ||
          box.right > safe.right + 1 ||
          box.top < safe.top - 1 ||
          box.bottom > safe.bottom + 1
          ? [
              {
                marker: el.getAttribute("aria-label"),
                box: {
                  left: box.left,
                  right: box.right,
                  top: box.top,
                  bottom: box.bottom,
                },
                safe,
              },
            ]
          : [];
      },
    );
  });
  expect(
    violations,
    "Pins and complete mascot remain inside the usable map extent",
  ).toEqual([]);
}

async function showList(page) {
  const button = page.getByRole("button", { name: "List view", exact: true });
  if (await button.isVisible()) await button.click();
  await page.locator(".food-card").first().waitFor();
}

async function showMap(page) {
  const button = page.getByRole("button", { name: "Map view", exact: true });
  if (await button.isVisible()) await button.click();
}

async function pinJourney(page) {
  const pins = page.getByRole("switch", { name: "Event pins", exact: true });
  await expect(pins).toBeChecked();
  await pins.click();
  await expect(pins).not.toBeChecked();
  await expect(page.locator(".food-marker")).toHaveCount(0);
  await page.reload();
  await page.locator('[data-map-ready="true"]').waitFor();
  await expect(pins).not.toBeChecked();
  await expect(page.locator(".food-marker")).toHaveCount(0);
  await pins.focus();
  await page.keyboard.press("Space");
  await expect(pins).toBeChecked();
  await page.locator(".food-marker").first().waitFor();
  await page.keyboard.press("Enter");
  await expect(pins).not.toBeChecked();
  await page.keyboard.press("Enter");
  await expect(pins).toBeChecked();
}

async function discoveryJourney(page, name) {
  await showList(page);
  const originalCount = await page.locator(".food-card").count();
  const search = page.getByRole("textbox", { name: "Search food or events" });
  await search.fill("pizza");
  await expect(page.locator(".food-card")).not.toHaveCount(0);
  expect(await page.locator(".food-card").count()).toBeLessThan(originalCount);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".food-card")).toHaveCount(originalCount);
  await page.getByRole("button", { name: /^Filters/ }).click();
  const confirmed = page.getByRole("button", { name: "CONFIRMED ONLY", exact: true });
  await confirmed.click();
  await expect(confirmed).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".food-card-status:not(.is-confirmed)")).toHaveCount(0);
  const confirmedCount = await page.locator(".food-card").count();
  for (const meal of ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]) {
    const chip = page.getByRole("button", { name: meal, exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  }
  // Empty meal selection means no meal restriction, matching eventVisible.
  await expect(page.locator(".food-card")).toHaveCount(confirmedCount);
  await search.fill("zzzz-no-food");
  await page.getByRole("heading", { name: "No bites just yet" }).waitFor();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator(".food-card")).toHaveCount(originalCount);
  await expect(confirmed).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await search.fill("zzzz-no-food");
  await page.getByRole("heading", { name: "No bites just yet" }).waitFor();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await page.locator(".food-card").first().click();
  const details = page.getByLabel("Event details", { exact: true });
  await expect(details).toBeVisible();
  await control(
    page,
    page.getByRole("button", { name: "Close event details", exact: true }),
    "Close details",
  );
  await shot(page, `${name}-event`);
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await showMap(page);
  const clustered = page.locator(
    '.food-marker[data-buildings~="tepper"], .food-marker[data-buildings*="tepper"]',
  );
  await clustered.first().click();
  const cluster = page.getByLabel("Overlapping food drops", { exact: true });
  await expect(cluster).toBeVisible();
  await control(
    page,
    page.getByRole("button", { name: "Close overlapping drops", exact: true }),
    "Close cluster",
  );
  await cluster
    .getByRole("button", { name: /AI Seminar: Grounded Campus Agents/ })
    .click();
  await expect(details).toContainText("AI Seminar: Grounded Campus Agents");
  await page.getByRole("button", { name: "Close event details", exact: true }).click();
  await expect(details).toHaveCount(0);
}

async function verifyIcs(page, button, name) {
  const pending = page.waitForEvent("download");
  await button.click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const destination = path.join(qa, `${name}.ics`);
  await download.saveAs(destination);
  const text = fs.readFileSync(destination, "utf8");
  expect(text).toContain("BEGIN:VCALENDAR\r\n");
  expect(text).toContain("END:VCALENDAR");
  expect(text).toContain("BEGIN:VEVENT");
  expect(text).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  const ids = [...text.matchAll(/^UID:(.+)$/gm)].map((match) => match[1]);
  expect(new Set(ids).size, "Calendar has no duplicate events").toBe(ids.length);
  return ids;
}

async function routeRendering(page) {
  const diagnostic = await page.evaluate(() => {
    const el = document.querySelector('[data-map-ready="true"]');
    let fiber = el?.[Object.keys(el).find((key) => key.startsWith("__reactFiber"))];
    let map;
    for (let n = 0; fiber && n < 15 && !map; n++, fiber = fiber.return) {
      for (let hook = fiber.memoizedState, i = 0; hook && i < 20; i++, hook = hook.next) {
        const value = hook.memoizedState?.current ?? hook.memoizedState;
        if (
          value &&
          typeof value.getStyle === "function" &&
          typeof value.queryRenderedFeatures === "function"
        ) {
          map = value;
          break;
        }
      }
    }
    if (!map) return { mapFound: false };
    const style = map.getStyle();
    return {
      mapFound: true,
      styleLoaded: map.isStyleLoaded(),
      sourceLoaded: map.getSource("cmu-meal-route")
        ? map.isSourceLoaded("cmu-meal-route")
        : false,
      source: style.sources["cmu-meal-route"],
      layers: style.layers.filter((layer) => layer.id.startsWith("cmu-meal-route")),
      rendered: map.queryRenderedFeatures({ layers: ["cmu-meal-route-line"] }).length,
    };
  });
  console.log("ROUTE RENDER DIAGNOSTIC", JSON.stringify(diagnostic));
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector(".maplibregl-canvas");
      if (!canvas) return false;
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d", { willReadFrequently: true });
      context.drawImage(canvas, 0, 0);
      const rgba = context.getImageData(0, 0, copy.width, copy.height).data;
      let count = 0;
      for (let i = 0; i < rgba.length; i += 4)
        if (
          Math.abs(rgba[i] - 18) < 4 &&
          Math.abs(rgba[i + 1] - 108) < 4 &&
          Math.abs(rgba[i + 2] - 134) < 4
        )
          count++;
      return count > 20;
    },
    undefined,
    { timeout: 10000 },
  );
}

async function routeOnMap(page) {
  const summary = page.getByRole("region", { name: "Meal route preview", exact: true });
  await expect(summary).toBeVisible();
  expect(Number(await summary.getAttribute("data-route-stop-count"))).toBeGreaterThan(0);
  expect(Number(await summary.getAttribute("data-route-point-count"))).toBeGreaterThan(1);
  const toggle = page.getByRole("switch", { name: "Meal route", exact: true });
  const map = page.getByRole("application", { name: "Carnegie Mellon campus map" });
  await expect(toggle).toBeChecked();
  await expect(map).toHaveAttribute("data-route-visible", "true");
  await control(page, toggle, "Meal route");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(map).toHaveAttribute("data-route-visible", "false");
  await expect(page.locator(".route-start-marker")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(toggle).toBeChecked();
  await expect(map).toHaveAttribute("data-route-visible", "true");
  const points = await summary.getAttribute("data-route-point-count");
  const pins = page.getByRole("switch", { name: "Event pins", exact: true });
  await pins.click();
  await expect(page.locator(".food-marker")).toHaveCount(0);
  await expect(toggle).toBeChecked();
  await expect(summary).toHaveAttribute("data-route-point-count", points);
  await pins.click();
  await expect(pins).toBeChecked();
  // Filtering display cards must not silently rewrite the saved itinerary.
  await page.getByRole("textbox", { name: "Search food or events" }).fill("zzzz-no-food");
  await expect(summary).toHaveAttribute("data-route-point-count", points);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await showMap(page);
}

async function planJourney(page, name) {
  await page.getByRole("button", { name: "My plan", exact: true }).click();
  const planner = page.getByRole("dialog", { name: "planner", exact: true });
  await expect(planner).toBeVisible();
  await planner.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
  await planner.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).waitFor();
  await expect(planner.locator("[role=alert]")).toHaveCount(0);
  await shot(page, `${name}-day-plan`);
  const firstIds = await verifyIcs(
    page,
    planner.getByRole("button", { name: "ADD DAY TO CALENDAR (.ICS)", exact: true }),
    `${name}-day`,
  );
  await planner.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).click();
  await expect(planner).toHaveCount(0);
  await routeOnMap(page);
  await shot(page, `${name}-meal-route`);

  // Re-running the demo must replace the plan, not accumulate duplicate events.
  await page.getByRole("button", { name: "My plan", exact: true }).click();
  await planner.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
  await planner.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).waitFor();
  const repeatedIds = await verifyIcs(
    page,
    planner.getByRole("button", { name: "ADD DAY TO CALENDAR (.ICS)", exact: true }),
    `${name}-repeat-day`,
  );
  expect(repeatedIds).toEqual(firstIds);
  await planner
    .getByRole("button", { name: "Plan my week", exact: true })
    .first()
    .click();
  for (const day of ["MONDAY", "WEDNESDAY", "FRIDAY"])
    await planner.getByRole("heading", { name: new RegExp(`^${day} ·`) }).waitFor();
  await expect(planner.locator("[role=alert]")).toHaveCount(0);
  await shot(page, `${name}-week-plan`);
  await planner
    .getByRole("button", { name: /^Show route for / })
    .first()
    .click();
  await expect(planner).toHaveCount(0);
  await routeOnMap(page);
  await shot(page, `${name}-week-route`);

  await page.getByRole("button", { name: "My plan", exact: true }).click();
  await planner.getByRole("button", { name: "Reset to default", exact: true }).click();
  await expect(
    planner.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(planner).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Meal route preview", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".route-start-marker, .map-route-toggle")).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Event pins", exact: true }),
  ).toBeChecked();
}

async function overlaysJourney(page) {
  for (const [button, dialog] of [
    ["Scotty", "Scotty"],
    ["To-dos", "quests"],
  ]) {
    const trigger = page.getByRole("button", { name: button, exact: true });
    await trigger.click();
    const panel = page.getByRole("dialog", { name: dialog, exact: true });
    await expect(panel).toBeVisible();
    await expect(panel).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(
      await panel.evaluate((el) => el.contains(document.activeElement)),
      `${dialog} traps focus`,
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
}

async function wanderJourney(page, name) {
  const mascot = page.locator(".scotty-wanderer");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mascot).toHaveAttribute("data-walking", "false");
  const still = await mascot.evaluate((el) => el.style.transform);
  await page.waitForTimeout(250);
  expect(await mascot.evaluate((el) => el.style.transform)).toBe(still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(
    (position) =>
      document.querySelector(".scotty-wanderer")?.style.transform !== position,
    still,
    { timeout: 8000 },
  );
  // The Playwright clock executes every animation frame, unlike fastForward,
  // which would skip frames and defeat the wander machine's 50ms delta cap.
  await page.evaluate(() => {
    window.__scottyMotionQa = {
      frames: 0,
      positions: new Set(),
      violations: [],
      active: true,
    };
    const inspect = () => {
      const state = window.__scottyMotionQa;
      if (!state.active) return;
      const el = document.querySelector(".scotty-wanderer");
      if (el) {
        const box = el.getBoundingClientRect();
        const map = document.querySelector(".campus-map-frame").getBoundingClientRect();
        const header = document.querySelector(".discovery-panel").getBoundingClientRect();
        const nav = document
          .querySelector('[aria-label="Primary"]')
          .getBoundingClientRect();
        const top =
          header.width >= innerWidth - 2 ? Math.max(map.top, header.bottom) : map.top;
        state.frames++;
        state.positions.add(el.style.transform);
        if (
          (box.left < Math.max(0, map.left) - 1 ||
            box.right > Math.min(innerWidth, map.right) + 1 ||
            box.top < top - 1 ||
            box.bottom > nav.top + 1) &&
          state.violations.length < 10
        ) {
          state.violations.push({
            time: performance.now(),
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          });
        }
      }
      requestAnimationFrame(inspect);
    };
    requestAnimationFrame(inspect);
  });
  await page.clock.runFor(65_000);
  const motion = await page.evaluate(() => {
    const state = window.__scottyMotionQa;
    state.active = false;
    return {
      frames: state.frames,
      positions: state.positions.size,
      violations: state.violations,
    };
  });
  expect(
    motion.frames,
    "More than 60 seconds of animation frames executed",
  ).toBeGreaterThan(3500);
  expect(motion.positions, "Scotty really moved during the extent check").toBeGreaterThan(
    100,
  );
  expect(
    motion.violations,
    "Scotty stayed fully inside the usable map over 65 simulated seconds",
  ).toEqual([]);
  await page.clock.resume();
  console.log(`${name}: 65-second movement extent`, JSON.stringify(motion));
}

async function extraLocalFeatures(page) {
  await showList(page);
  const rsvp = page.locator(".food-card").filter({ hasText: "RSVP needed" }).first();
  await rsvp.click();
  const details = page.getByLabel("Event details", { exact: true });
  await details
    .getByRole("button", { name: "Report Plenty remaining", exact: true })
    .click();
  await expect(details).toContainText("Plenty left");
  await details
    .getByRole("button", { name: "Report Some remaining", exact: true })
    .click();
  await expect(details).toContainText("Some left");
  await details
    .getByRole("button", { name: "Report Gone remaining", exact: true })
    .click();
  await expect(details).toContainText("Gone");
  await verifyIcs(
    page,
    details.getByRole("button", { name: ".ICS", exact: true }),
    "single-event",
  );
  await details.getByRole("button", { name: "SAVE RSVP QUEST", exact: true }).click();
  const quests = page.getByRole("dialog", { name: "quests", exact: true });
  await expect(quests.locator("article")).toHaveCount(1);
  await quests.getByRole("button", { name: "DONE", exact: true }).click();
  await expect(quests.locator("article")).toHaveClass(/opacity-60/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Scotty", exact: true }).click();
  const pet = page.getByRole("dialog", { name: "Scotty", exact: true });
  await pet.getByRole("textbox", { name: "Pet name", exact: true }).fill("QA Scotty");
  await page.keyboard.press("Enter");
  await pet
    .locator('input[type="file"]')
    .setInputFiles({ name: "qa-food.png", mimeType: "image/png", buffer: tilePng });
  await expect(pet).toContainText("Sample dishes:");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "QA Scotty wandering campus", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My plan", exact: true }).click();
  const planner = page.getByRole("dialog", { name: "planner", exact: true });
  await planner
    .getByRole("textbox", { name: "Preference description" })
    .fill("I am vegetarian, like pizza, and can walk 10 minutes.");
  await planner.getByRole("button", { name: "Update preferences", exact: true }).click();
  await expect(planner).toContainText("Understood");
  await expect(planner.locator("[role=alert]")).toHaveCount(0);
  await planner.getByRole("button", { name: "Reset to default", exact: true }).click();
  await expect(
    planner.getByRole("textbox", { name: "Preference description" }),
  ).toHaveValue("");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "To-dos", exact: true }).click();
  await expect(page.getByText("No RSVP tasks yet", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Scotty wandering campus", exact: true }),
  ).toBeVisible();
}

async function viewportSuite(browser, url, viewport) {
  const { context, page, errors } = await contextFor(browser, url, viewport);
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    await page.clock.install();
    await loaded(page, url);
    await controls(page);
    await mapBounds(page);
    await shot(page, `${viewport.name}-fixture-map`);
    await pinJourney(page);
    await discoveryJourney(page, viewport.name);
    await planJourney(page, viewport.name);
    await overlaysJourney(page);
    await mapBounds(page);
    await wanderJourney(page, viewport.name);
    // Resize the same mounted map both directions; do not let a fresh page hide
    // stale one-time camera fitting or breakpoint-boundary layout defects.
    const alternate =
      viewport.width > 768 || viewport.height > viewport.width
        ? { width: 667, height: 375 }
        : { width: 390, height: 844 };
    await page.setViewportSize(alternate);
    await page.waitForTimeout(350);
    await controls(page);
    await mapBounds(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(350);
    await controls(page);
    await mapBounds(page);
    if (viewport.name === "desktop") await extraLocalFeatures(page);
    await noOverflow(page);
    expect(new URL(page.url()).pathname).toBe(new URL(url).pathname);
    expect(errors, "No browser runtime errors").toEqual([]);
    results.push({
      name: viewport.name,
      status: "passed",
      viewport,
      simulatedWalkingSeconds: 65,
    });
    console.log(
      `PASS ${viewport.name}: controls, pins, filters, clusters/details, day/week/repeat plans, route, ICS, reset, overlays, motion, resize`,
    );
  } catch (error) {
    await shot(page, `${viewport.name}-FAIL`).catch(() => {});
    results.push({
      name: viewport.name,
      status: "failed",
      error: String(error),
      runtimeErrors: errors,
    });
    console.error(`FAIL ${viewport.name}:`, error);
  } finally {
    await context.tracing.stop({ path: path.join(qa, `${viewport.name}-trace.zip`) });
    await context.close();
  }
}

async function interruptedPlanSuite(browser, url) {
  const name = "interrupted-plan-reset";
  const { context, page, errors } = await contextFor(browser, url, viewports[0]);
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    // Static-demo planning constructs a Response in the browser; delaying a
    // network /api/plan request would not actually exercise this race.
    await page.addInitScript(() => {
      const original = Response.prototype.json;
      window.__scottyPlanRaceQa = {
        armed: true,
        pending: false,
        released: false,
        release: null,
      };
      Response.prototype.json = async function (...args) {
        const payload = await original.apply(this, args);
        const state = window.__scottyPlanRaceQa;
        if (
          state.armed &&
          payload &&
          typeof payload === "object" &&
          (payload.itinerary || payload.week)
        ) {
          state.armed = false;
          state.pending = true;
          await new Promise((resolve) => {
            state.release = () => {
              state.pending = false;
              state.released = true;
              resolve();
            };
          });
        }
        return payload;
      };
    });
    await loaded(page, url);
    await page.getByRole("button", { name: "My plan", exact: true }).click();
    const planner = page.getByRole("dialog", { name: "planner", exact: true });
    await planner.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
    await page.waitForFunction(() => window.__scottyPlanRaceQa.pending);
    await page.keyboard.press("Escape");
    await expect(planner).toHaveCount(0);
    await page.getByRole("button", { name: "My plan", exact: true }).click();
    await planner.getByRole("button", { name: "Reset to default", exact: true }).click();
    await page.evaluate(() => window.__scottyPlanRaceQa.release());
    // Let the released JSON promise and submit's following microtasks settle.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const savedIds = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("scottybites:last-plan-ids") || "[]"),
    );
    expect(savedIds, "An unmounted planner must not save after a later reset").toEqual(
      [],
    );
    await expect(
      planner.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Meal route preview", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".route-start-marker, .map-route-toggle")).toHaveCount(0);
    await expect(
      page.getByRole("application", { name: "Carnegie Mellon campus map" }),
    ).toHaveAttribute("data-route-visible", "false");
    expect(errors, "Interrupted planning must not create runtime errors").toEqual([]);
    await shot(page, name);
    results.push({ name, status: "passed" });
    console.log(
      "PASS interrupted-plan-reset: delayed response cannot resurrect a reset plan after Escape/unmount",
    );
  } catch (error) {
    await shot(page, `${name}-FAIL`).catch(() => {});
    results.push({ name, status: "failed", error: String(error), runtimeErrors: errors });
    console.error(`FAIL ${name}:`, error);
  } finally {
    await context.tracing.stop({ path: path.join(qa, `${name}-trace.zip`) });
    await context.close();
  }
}

async function fallbackSuite(browser, url, noWebgl) {
  const name = noWebgl ? "no-webgl" : "offline-tiles";
  const { context, page, errors } = await contextFor(
    browser,
    url,
    viewports[1],
    "offline",
  );
  try {
    if (noWebgl)
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
          return original.call(this, type, ...args);
        };
      });
    await loaded(page, url, false);
    await page.getByText(unavailable, { exact: true }).waitFor();
    await expect(
      page.locator(".food-marker, .route-start-marker, .scotty-wanderer"),
    ).toHaveCount(0);
    await showList(page);
    await page.locator(".food-card").first().click();
    await expect(page.getByLabel("Event details", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "My plan", exact: true }).click();
    await page.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
    await page.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).waitFor();
    await verifyIcs(
      page,
      page.getByRole("button", { name: "ADD DAY TO CALENDAR (.ICS)", exact: true }),
      name,
    );
    await page.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).click();
    await expect(
      page.locator(".food-marker, .route-start-marker, .scotty-wanderer"),
    ).toHaveCount(0);
    await noOverflow(page);
    await shot(page, name);
    expect(errors).toEqual([]);
    results.push({ name, status: "passed" });
    console.log(`PASS ${name}: explicit fallback, list/details, planner and ICS usable`);
  } catch (error) {
    await shot(page, `${name}-FAIL`).catch(() => {});
    results.push({ name, status: "failed", error: String(error), runtimeErrors: errors });
  } finally {
    await context.close();
  }
}

async function realProviderSmoke(browser, url) {
  const { context, page, errors } = await contextFor(browser, url, viewports[0], "live");
  try {
    await loaded(page, url, false);
    const ready = await page
      .locator('[data-map-ready="true"]')
      .waitFor({ timeout: 30_000 })
      .then(
        () => true,
        () => false,
      );
    if (ready) {
      await page.locator(".food-marker").first().waitFor();
      await mapBounds(page);
      await shot(page, "desktop-live-street-map");
      await page.getByRole("button", { name: "My plan", exact: true }).click();
      await page.getByRole("button", { name: "RUN DEMO PLAN", exact: true }).click();
      await page.getByRole("button", { name: "BACK TO DISCOVERY", exact: true }).click();
      await routeOnMap(page);
      // Real basemap screenshots are distinct from fixtures, for route contrast
      // and visual review on desktop, portrait and a short landscape screen.
      for (const viewport of viewports.slice(0, 3)) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(750);
        await controls(page);
        await mapBounds(page);
        await expect(
          page.getByRole("region", { name: "Meal route preview", exact: true }),
        ).toBeVisible();
        await shot(page, `${viewport.name}-live-meal-route`);
      }
      expect(errors).toEqual([]);
      results.push({ name: "live-provider", status: "passed" });
      console.log("LIVE PROVIDER PASS: actual street tiles and markers rendered");
    } else {
      await expect(page.getByText(unavailable, { exact: true })).toBeVisible();
      results.push({
        name: "live-provider",
        status: process.env.SCOTTY_REQUIRE_LIVE_TILES === "1" ? "failed" : "not-verified",
        reason:
          "External tiles unavailable; deterministic map interactions and fallback are tested separately",
      });
      console.log(
        "LIVE PROVIDER NOT VERIFIED: external tiles unavailable (set SCOTTY_REQUIRE_LIVE_TILES=1 to require provider readiness)",
      );
    }
  } catch (error) {
    await shot(page, "live-provider-FAIL").catch(() => {});
    results.push({ name: "live-provider", status: "failed", error: String(error) });
  } finally {
    await context.close();
  }
}

let server;
let browser;
try {
  let url = process.env.SCOTTY_QA_URL;
  if (!url) ({ server, url } = await serveStatic());
  const target = new URL(url);
  if (!target.pathname.endsWith("/")) target.pathname += "/";
  url = target.href;
  console.log(`QA target: ${url}`);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            process.env.CHROMIUM_EXECUTABLE_PATH,
        }
      : {}),
  });
  if (process.env.SCOTTY_EXPECTED_SOURCE) {
    const context = await browser.newContext();
    try {
      const response = await context.request.get(
        new URL(`deployment.json?qa=${Date.now()}`, url).href,
      );
      expect(response.ok(), "Published deployment manifest is accessible").toBe(true);
      const manifest = await response.json();
      expect(manifest.source_commit, "Published commit matches requested source").toBe(
        process.env.SCOTTY_EXPECTED_SOURCE,
      );
      expect(manifest.mode).toBe("static-demo");
      results.push({
        name: "published-source",
        status: "passed",
        source: manifest.source_commit,
      });
    } finally {
      await context.close();
    }
  }
  for (const viewport of viewports) await viewportSuite(browser, url, viewport);
  await interruptedPlanSuite(browser, url);
  await fallbackSuite(browser, url, false);
  await fallbackSuite(browser, url, true);
  await realProviderSmoke(browser, url);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
  else
    console.log(
      "UI REGRESSION PASS: all deterministic viewport and fallback suites completed; see report.json for external provider status",
    );
} catch (error) {
  results.push({ name: "setup", status: "failed", error: String(error) });
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(qa, "report.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2) + "\n",
  );
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
