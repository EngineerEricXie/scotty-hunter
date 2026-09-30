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
  const browser = await chromium.launch({ headless: true });
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
  await page.getByRole("button", { name: "SEE ITINERARY ON MAP", exact: true }).waitFor();
  await page.screenshot({ path: root + "/qa/desktop-plan.png" });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "ADD DAY TO CALENDAR (.ICS)", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs(root + "/qa/itinerary.ics");
  await page.getByRole("button", { name: "SEE ITINERARY ON MAP", exact: true }).click();
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
    "UI PASS: desktop/mobile, search empty/reset, details, demo itinerary, ICS export, overlay dismissal, base path, no runtime errors",
  );
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
