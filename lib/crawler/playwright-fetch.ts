/**
 * Optional Playwright fetch adapter.
 * Playwright is NOT installed by default — the app does not need it to run.
 *
 * Manual/optional step: npm i -D playwright && npx playwright install chromium
 * Then set PLAYWRIGHT_FETCH=true for JS-heavy public pages.
 */
export async function fetchRenderedHtml(): Promise<never> {
  throw new Error(
    "Playwright fallback is not installed. The local demo uses fixture/heuristic extraction. To enable later: install project-local Playwright Chromium and set PLAYWRIGHT_FETCH=true.",
  );
}

export function playwrightAvailable(): boolean {
  return process.env.PLAYWRIGHT_FETCH === "true";
}
