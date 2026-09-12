# ScottyBites

Map-first CMU free-food discovery and planning. Messy event pages become structured meals, with evidence, walking-aware itineraries, and RSVP to-dos.

**Never miss free food at CMU again.**

## Run the demo (no API keys)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo mode is on by default (`NEXT_PUBLIC_DEMO_MODE=true`, demo date `2026-09-12`). The app does not need OpenAI, Supabase, Mapbox, Google, or campus website access.

## Architecture

```text
Source registry
  → fetch public HTML (or fixture)
  → readable text
  → EventExtractor (heuristic default / LLM scaffold)
  → food / time / location normalization
  → Zod validation
  → dedup
  → EventRepository (local fixtures default / Supabase scaffold)
  → map · Scotty pet · Food Dex · planner · to-dos · ICS
```

Replaceable adapters:

| Interface | Local / demo | Real (deferred without credentials) |
| --- | --- | --- |
| `EventRepository` | `LocalFixtureEventRepository` | `SupabaseEventRepository` |
| `EventExtractor` | `HeuristicEventExtractor` | `LLMEventExtractor` |
| `CalendarService` | `MockCalendarService` + ICS | `GoogleCalendarService` |
| `FoodVisionService` | `MockFoodVisionService` | `GrokFoodVisionService` (`GROK_API`) |
| Map | Pixel campus map (default) + MapLibre/Carto GEO toggle | optional MapTiler/Mapbox token |

## Data sources

**Deterministic / local (what the demo uses)**

- HackCMU 2026 opening-ceremony **fixture text** — not a live PDF scrape
- Additional seeded CMU events (seminars, mixer, RSVP lunch, off-campus dinner)

**Public adapters (best-effort, optional)**

- `https://events.cmu.edu/`
- `https://www.cs.cmu.edu/calendar`

A failed live crawl cannot crash the app. `POST /api/crawl` is isolated per source.

## Environment variables

Copy `.env.example`. All keys are optional. Defaults already run the local demo.

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | Force fixture repository (default `true`) |
| `NEXT_PUBLIC_DEMO_DATE` | Calendar day labeled “Today” (default `2026-09-12`) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | MapLibre style (default OpenFreeMap liberty) |
| `GROK_API` | xAI Grok for preference parsing and food-photo vision |
| `GROK_BASE_URL` / `GROK_MODEL` / `GROK_VISION_MODEL` | Optional Grok host/model (defaults: `https://api.x.ai/v1`, `grok-4.6`) |
| `EXTRACTION_PROVIDER=llm` + `OPENAI_API_KEY` | Real LLM event extraction (OpenAI-compatible; not used for preferences when `GROK_API` is set) |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | Custom host (default OpenAI; IFM: `https://api.ifm.ai/v1` + `IFM/K2-Horizon-375B-A23B`) |
| `NEXT_PUBLIC_SUPABASE_URL` + anon/service keys | Postgres backend |
| `GOOGLE_CALENDAR_CLIENT_ID` / secret / redirect | Google Calendar OAuth |
| `MAPBOX_TOKEN` / `MAPTILER_API_KEY` | Alternate map tiles |

Do not invent fake keys. Leave them blank until a human creates the provider account.

## Tests, lint, production

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## 3-minute demo flow

1. Open ScottyBites — CMU map with food markers.
2. Switch **Today / Tomorrow / date** and meal pills.
3. Tap **Saturday Lunch** or **AI Seminar**.
4. Show **Confirmed food**, confidence, and the evidence quote.
5. Open **Heinz policy lunch** (tomorrow) — RSVP deadline.
6. **Save RSVP To-Do**.
7. Open **Plan** — lunch + dinner, 12–15 min walk, start at Gates.
8. **Plan my free food day** — non-overlapping itinerary.
9. Download **Add day to calendar (.ics)**.
10. Tap **Saturday Lunch** on the map → **UPLOAD PHOTO TO UNLOCK** — the listing only said “Lunch will be provided,” but the table photo reveals vegetarian pizza, salad, and fruit.
11. Optional stretch: 3D building extrusion, or another mock photo on **Me**.
12. Close with: structured data came from messy fixture/source text, not a hand-typed spreadsheet.

Walking estimate: Haversine between building coordinates at **80 m/min** (~4.8 km/h). Savings figures are a labeled $12/meal illustration, not factual accounting.

## Manual steps that remain

These are intentionally unfinished because they need a human:

1. Create a Supabase project and paste URL + keys, then apply `supabase/migrations/`.
2. Create an LLM provider key and set `EXTRACTION_PROVIDER=llm` (optional `OPENAI_BASE_URL` / `OPENAI_MODEL` for IFM K2 Horizon).
3. Create Google OAuth credentials and authorize Calendar.
4. Deploy to Vercel (log in, set env vars).
5. Optionally install Playwright Chromium for JS-heavy public pages.

## Limitations

- No live campus crawl is required; judging should use fixtures.
- Indoor floor geometry is not modeled.
- Google Calendar is ICS-only until OAuth exists.
- Photo labels are mocked.
- Building footprints are schematic rectangles for extrusion, not official GIS.
