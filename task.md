# ScottyBites / CMU Free Food Agent — `task.md`

> HackCMU 2026 implementation plan  
> Goal: build an **agentic, personalized campus meal planner** that turns CMU’s fragmented event ecosystem into a trusted free-meal itinerary the user can act on.

---

## Implementation status (existing repo)

The current repository already has a working **no-key local demo**: Next.js app, adapter architecture, HackCMU 2026 fixture extraction, seeded events, campus map (pixel + MapLibre), day planner, local RSVP To-Dos, ICS export, SQL/Supabase scaffold, IFM/OpenAI-compatible LLM extractor scaffold, tests, lint, typecheck, production build.

**Still missing relative to this repositioned P0** (do these next; do not rebuild the skeleton):

- hard vs soft personalization in the planner
- food item / cuisine / dietary metadata extraction
- dietary compatibility `COMPATIBLE | INCOMPATIBLE | UNKNOWN`
- preference matcher + explainability (`positiveReasons`, `warnings`, `rejectionReasons`)
- weekly planner (`Plan my week`)
- skippable onboarding + planner preference chips that actually change ranking
- RSVP workflow treated as a first-class future-opportunity loop

**Present in the repo but demoted** — do not expand during remaining hackathon time:

- 3D building extrusion / camera polish
- Scotty pet, Food Dex, points, rival leaderboard
- mock photo check-in and local NOW GOING / leftover reports
- indoor floor selector prototype

Deferred (need a human / credentials): live Supabase project, Google OAuth, Vercel login, Playwright Chromium, real vision API.

---

# 0. Project Mission

Build a responsive web/PWA for Carnegie Mellon University students that can:

1. Continuously discover CMU events from multiple public sources.
2. Extract **grounded** structured event data from messy HTML, PDFs, and descriptions.
3. Detect free food **and** preserve evidence, confidence, food items, cuisine tags, and dietary tags when the source supports them.
4. Normalize time, CMU buildings, and duplicates.
5. Capture **hard constraints** and **soft preferences** for a real person.
6. Filter, score, and optimize a **personalized free-meal itinerary** for a day or week.
7. Explain why each event was selected, and surface uncertainty instead of faking certainty.
8. Turn future RSVP deadlines into actionable To-Dos.
9. Visualize the plan on a polished CMU map and optionally export to calendar.
10. Stay demo-reliable without private API keys.

The product is **not** primarily a free-food finder, a map, an LLM wrapper, or a free-food alert app.

It is a system that continuously discovers **future** opportunities and helps the user structure their schedule around them.

### One-sentence pitch

> **ScottyBites turns CMU’s fragmented event ecosystem into a personalized free-meal plan.**

### Demo-oriented framing

> **An AI agent that finds tomorrow’s free food today — and plans your campus schedule around it.**

### Central workflow

```text
DISCOVER
  → EXTRACT
  → VERIFY
  → PERSONALIZE
  → OPTIMIZE
  → RSVP
  → ACT
```

Every major feature must strengthen:

```text
DISCOVER → UNDERSTAND → PERSONALIZE → OPTIMIZE → ACT
```

---

# 0.1 Competitive positioning

Existing campus free-food products already cover overlapping combinations of:

- free-food maps
- community-reported leftovers
- notifications / alerts
- 3D campus maps
- photo uploads
- availability reports
- dietary filters

Do not compete on “another map with pins.”

**Differentiation**

```text
PROACTIVE
+ AUTOMATED
+ PERSONALIZED
+ OPTIMIZED
+ ACTIONABLE
```

Strategic quadrant:

|  | Manual / community data | Automated multi-source ingestion |
| --- | --- | --- |
| Reactive discovery (“what’s out right now”) | crowded | commodity alerts |
| **Proactive future planning** | calendar homework | **ScottyBites** |

Target:

**proactive future planning + automated ingestion.**

The hero question is not “Where is free food?”

It is:

> Given who I am, where I will be, what I eat, and what I am willing to do, what is the best free-food plan for my day or week?

---

# 0.2 Five core product pillars

Reorganize all work around these pillars. The map is an important **interaction surface**, not the core technical novelty. Gamification and advanced 3D visualization are stretch.

## 1. Agentic event discovery

Multi-source registry, fetch, readable text, incremental crawl, provenance. Discover **future** events, not only “happening now.”

## 2. Grounded food + RSVP extraction

Structured extraction with Zod validation. Food status, items, cuisine, dietary tags, evidence, confidence, registration requirement, deadline, URL. Never invent unsupported facts.

## 3. User personalization

Hard constraints vs soft preferences. Onboarding is lightweight. Preferences feed filtering, ranking, optimization, and explanations — they are not an isolated profile screen.

## 4. Spatiotemporal meal optimization

Phase 1 hard filter → Phase 2 personalized scoring → Phase 3 itinerary construction for a day and a simplified week.

## 5. RSVP / action workflow

Future opportunity → deadline → Todo → reminder / calendar → attend. Prefer events the user can still realistically register for.

---

# 1. Hackathon Constraints

Source reference: `HackCMU 2026 Opening Ceremony.pdf`

Relevant facts from the organizer deck:

- HackCMU is a **24-hour hackathon**.
- Teams are up to 4 people.
- “Food” is one of the official tracks.
- Judging emphasizes Originality, Technical Difficulty, Demo Quality, Usefulness, Track Relevance.
- The judging slide distinguishes real technical work from a simple “ChatGPT wrapper.”
- Demo/presentation time is approximately **3 minutes**.
- The HackCMU schedule itself includes food events, making the PDF a useful unstructured-extraction fixture.

### Product implication

Do **not** attempt to finish every stretch feature.

Do **not** spend remaining time on 3D campus spectacle, indoor GIS, or gamification.

The winning MVP is this vertical slice:

```text
MULTIPLE EVENT SOURCES
        ↓
RAW HTML / PDF / TEXT
        ↓
AGENT / STRUCTURED EXTRACTION
        ↓
FOOD + RSVP + DIETARY METADATA
        ↓
NORMALIZATION
        ↓
DATABASE / LOCAL REPOSITORY
        ↓
USER PREFERENCES
        ↓
HARD CONSTRAINT FILTER
        ↓
PERSONALIZED EVENT SCORING
        ↓
SPATIOTEMPORAL OPTIMIZATION
        ↓
PERSONALIZED MEAL PLAN
        ↓
RSVP TODO
        ↓
MAP / CALENDAR ACTION
```

Everything else is secondary.

---

# 2. Priority Levels

Use these labels consistently:

- **P0** — Required for a convincing demo of the **personalized planner**.
- **P1** — High-value stretch after the vertical slice works.
- **P2** — Nice-to-have only if the planner is already stable and explainable.
- **POST** — Post-hackathon product work.

### Scope rule

Before starting any P1/P2 task, the **repositioned** P0 must work:

- [x] App starts locally with one command.
- [x] Seeded demo works without external network dependencies.
- [x] Map displays event markers.
- [x] Basic day planner returns a non-overlapping itinerary.
- [x] No critical runtime errors.
- [x] Personalization (hard + soft) changes candidate eligibility and ranking.
- [x] Planner explains why each selected event was chosen.
- [x] Uncertainty is visible (dietary UNKNOWN, likely food, unclear RSVP).
- [x] Future RSVP deadline becomes an actionable To-Do from the plan.
- [x] Weekly plan (even simplified deterministic) runs from campus days + meals.

---

# 2.1 Implementation priority order

Work in this order. Do not skip ahead to P2 map/gamification.

### P0

1. Project foundation (exists)
2. Normalized event data model (extend, do not replace)
3. User personalization model
4. CMU building/location model (exists; keep)
5. Deterministic fixture repository (exists; enrich dietary/RSVP examples)
6. Source registry (exists)
7. Ingestion (exists)
8. Extraction architecture (exists; extend metadata)
9. Food metadata extraction (`food_items`, `cuisine_tags`, `dietary_tags`)
10. Food evidence / confidence (exists; keep grounded)
11. RSVP extraction (exists; deepen deadline/status)
12. Time normalization (exists)
13. Location normalization (exists)
14. Deduplication (exists)
15. Dietary compatibility logic
16. Preference matching
17. Walking calculation (exists)
18. Hard constraint engine
19. Personalized scoring
20. Itinerary optimizer (extend current greedy planner)
21. Planner explainability
22. RSVP Todo workflow (upgrade from list → future-opportunity loop)
23. Weekly planner (simplified deterministic is acceptable)
24. Map UI as visualization of the plan (keep simple)
25. Planner UI with reasons, warnings, chips
26. Preference onboarding (skippable)
27. Filters (map + planner chips)
28. Tests (especially personalization)
29. Demo reliability / fixture fallback
30. UI polish of the planner narrative

### P1

- additional real public CMU sources
- Google Calendar OAuth
- ICS (already scaffolded — keep, do not rebuild)
- more advanced walking routing
- richer weekly optimization
- richer dietary extraction
- notification architecture
- subtle 3D map enhancements only if planner P0 is done

### P2

- photo recognition
- community food remaining
- points / leaderboard / badges
- detailed 3D map
- indoor floors
- adaptive recommendation learning

### POST

- native mobile apps
- production-scale crawling
- full campus GIS
- multi-university expansion
- autonomous registration (only where appropriate and allowed)
- advanced recommendation learning

---

# 3. Definition of Done for HackCMU

The project is demo-ready when a judge can see this flow:

1. Open ScottyBites (map is available immediately; onboarding can be skipped).
2. Optionally complete a 5-step lightweight preference flow, **or** set chips on Plan.
3. Show a messy source / fixture turning into structured food + RSVP + evidence.
4. Set:

```text
Campus: Monday, Wednesday, Friday
Meals: lunch + dinner
Vegetarian
Likes pizza + Asian food
Max walk 12 minutes
Willing to RSVP
```

5. Click **Plan my week** (or Plan today if week is the simplified fallback).
6. Receive an actionable itinerary, not a search-result list.
7. Each selected event shows meal, food, walk, confidence, and **why selected**.
8. Warnings appear when dietary details are incomplete or food is only likely.
9. A future registration deadline becomes **Add RSVP To-Do**.
10. Map shows the chosen events spatially.
11. Explain that data came from unstructured sources, not a hand-typed spreadsheet.

### Hero itinerary shape

```text
WEDNESDAY

12:00–1:00 PM
Machine Learning Seminar
Tepper 1403
🍕 Vegetarian pizza available
8 min walk
98% food confidence

Why selected:
- matches lunch
- vegetarian-compatible
- preferred food
- short walk
- confirmed food

5:30–7:00 PM
Startup Networking Night
CUC
🥡 Asian catering
6 min walk
92% food confidence

Action required:
RSVP by Tuesday 11:59 PM

[Add RSVP Todo]
```

---

# 3.1 Success metrics for MVP

Measurable. If a metric fails, the corresponding P0 task is not done.

### Extraction

- HackCMU fixture processes into normalized events.
- Captures title / time / location when the source supports them.
- Preserves food evidence for every non-`NONE` food claim.
- Captures RSVP required / URL / deadline when present.
- “Pizza will be provided.” → `food_items` includes pizza; vegetarian compatibility stays **UNKNOWN** unless vegetarian pizza is explicit.

### Personalization

- Changing vegetarian preference changes eligibility or ranking.
- Changing favorite foods changes ranking when other factors are equal.
- Changing max walking time changes the itinerary.
- `minimum_food_confidence = explicit only` filters LIKELY events.

### Planner

- Never knowingly selects overlapping events.
- Respects walking constraints (hard max).
- Respects expired registration deadlines unless the user explicitly allows them.
- Deterministic output from deterministic inputs (no LLM in the optimizer).

### Explainability

- Every selected event has at least one `positiveReasons` entry.
- Uncertainty warnings appear when dietary compatibility is UNKNOWN or food is not EXPLICIT.

### RSVP

- A future event deadline generates an actionable To-Do.
- Planner prefers events the user can still realistically register for.

### Demo

- Primary flow works offline / without private API keys (`NEXT_PUBLIC_DEMO_MODE=true`).
- LLM extraction may be shown as a stretch if `EXTRACTION_PROVIDER=llm` is configured; judging must not depend on it.

---

# 4. Recommended Technical Stack

## Frontend

- [x] Next.js
- [x] TypeScript
- [x] Tailwind CSS
- [x] MapLibre GL JS (GEO mode) + pixel campus map (current default visualization)
- [ ] Framer Motion only where it improves polish <!-- CSS transitions used instead -->
- [x] Responsive PWA layout
- [ ] Optional component primitives: shadcn/ui

Keep the UI map-first, but the **narrative** is planner-first. Prefer clear chips, reasons, and timelines over decorative 3D.

## Backend

- [x] Next.js route handlers / server actions
- [ ] Supabase Postgres / Auth / Storage
  <!-- Scaffolded. LocalFixtureEventRepository is the demo default. -->
- [ ] Optional PostGIS only if spatial queries become useful

## Data ingestion

- [x] `fetch` for public HTML
- [x] Cheerio for HTML parsing
- [ ] Playwright for JS-heavy public pages <!-- scaffolded; P1, not required for demo -->
- [ ] PDF text extraction <!-- fixture text used; original PDF not in repo -->
- [x] LLM structured output scaffold (`LLMEventExtractor`, OpenAI-compatible / IFM via `OPENAI_BASE_URL` + `OPENAI_MODEL`)
- [x] Zod validation
- Default extractor remains **heuristic** so demo never requires a key

## Mapping

- [x] MapLibre GL
- [x] OpenStreetMap-compatible tiles
- [x] CMU building coordinates / GeoJSON
- [x] Optional 3D extrusion — **P2 / do not expand**

## AI

Use AI only where semantic interpretation is necessary:

- event extraction
- food / cuisine / dietary metadata extraction
- RSVP / deadline extraction
- optional food-photo recognition (**P2**)

Do **not** use an LLM for deterministic tasks:

- date filtering after normalization
- distance formulas
- database CRUD
- schedule conflict detection
- scoring / optimization
- preference matching
- deduplication by exact URL/hash
- explainability string assembly from structured reason codes

Personalization and planning must remain **deterministic and explainable**.

---

# 5. Repository Structure

Existing layout (keep). Add personalization modules rather than a new app.

```text
scotty-hunter/
├── app/
│   ├── page.tsx                  # map visualization
│   ├── map/
│   ├── plan/                     # hero: day + week planner
│   ├── todos/                    # RSVP action queue
│   ├── profile/                  # advanced prefs; not the only entry
│   ├── scotty/                   # P2 gamification; do not expand
│   ├── event/[id]/
│   └── api/
│       ├── events/
│       ├── plan/                 # accept UserConstraints + UserPreferences
│       ├── crawl/
│       ├── calendar/
│       └── sources/
│
├── components/
│   ├── map/                      # visualization only
│   ├── events/
│   ├── planner/
│   │   ├── PlannerForm.tsx
│   │   ├── PreferenceChips.tsx   # NEW: quick personalization
│   │   ├── MealItinerary.tsx     # must show reasons + warnings
│   │   ├── WeekItinerary.tsx     # NEW
│   │   └── RouteSummary.tsx
│   ├── onboarding/               # NEW: skippable 5-step
│   └── todos/
│
├── lib/
│   ├── crawler/
│   ├── extraction/
│   │   ├── event-schema.ts       # extend food metadata
│   │   ├── extract-events.ts
│   │   ├── classify-food.ts
│   │   ├── classify-dietary.ts   # NEW
│   │   ├── normalize-location.ts
│   │   └── normalize-time.ts
│   ├── personalization/          # NEW
│   │   ├── types.ts
│   │   ├── dietary-compatibility.ts
│   │   ├── hard-constraints.ts
│   │   └── match-event.ts
│   ├── planner/
│   │   ├── score-event.ts        # personalized weights
│   │   ├── walking-time.ts
│   │   ├── conflicts.ts
│   │   ├── explain.ts            # NEW reason codes → copy
│   │   ├── build-itinerary.ts    # day
│   │   └── build-week.ts         # NEW simplified week
│   ├── dedup/
│   ├── maps/
│   ├── calendar/
│   ├── db/
│   └── scotty/                   # P2; do not expand
│
├── data/fixtures/hackcmu-2026/
├── data/geo/
├── supabase/migrations/
├── tests/
│   ├── extraction/
│   ├── personalization/          # NEW
│   ├── planner/
│   └── dedup/
├── task.md
├── README.md
└── .env.example
```

---

# 6. Core Data Model

## 6.1 `sources`

```text
id
name
base_url
source_type
parser_type
enabled
crawl_interval_minutes
last_crawled_at
last_success_at
last_error
created_at
updated_at
```

Enums:

```text
source_type:
- official_calendar
- department
- student_org
- company_event
- pdf
- manual
- other

parser_type:
- html
- javascript
- pdf
- ics
- rss
- fixture
```

---

## 6.2 `buildings`

```text
id
name
short_name
aliases[]
latitude
longitude
campus_zone
off_campus
geojson_feature_id
created_at
updated_at
```

Seed at least: Gates Hillman Center, Tepper Quad, Cohon University Center, Wean Hall, Doherty Hall, Hunt Library, Newell-Simon Hall, Hamburg Hall, Posner Hall.

Do not attempt perfect CMU coverage before the demo.

---

## 6.3 `events`

```text
id
source_id
source_external_id
title
description
organizer

start_time
end_time
timezone

source_url
source_type

venue_raw
building_id
room
floor
location_confidence          # RESOLVED | PARTIAL | UNKNOWN
location_status              # same idea as location_confidence

food_status                  # EXPLICIT | LIKELY | POSSIBLE | NONE
food_types[]                 # meal windows + coarse types
food_items[]                 # pizza, sandwiches, tacos, salad, pastries, coffee, …
cuisine_tags[]               # American, Chinese, Korean, Japanese, Indian, Mediterranean, Mexican, Italian, …
dietary_tags[]               # vegetarian, vegan, halal, kosher, gluten-free, dairy-free, … only if sourced
food_confidence
food_evidence

registration_required        # true | false | null
registration_status          # NOT_REQUIRED | REQUIRED | UNKNOWN
registration_url
registration_deadline

eligibility
capacity_notes
event_types[]                # talk, mixer, workshop, career, social, …

raw_content_hash
extraction_version
provenance_note
fingerprint

last_checked_at
created_at
updated_at
```

### `food_status`

```text
EXPLICIT
LIKELY
POSSIBLE
NONE
```

### `food_types` (meal / coarse)

```text
breakfast
brunch
lunch
dinner
pizza
snacks
dessert
refreshments
drinks
catering
unknown
```

### `food_items` examples

```text
pizza
sandwiches
tacos
salad
pastries
coffee
```

### `cuisine_tags` examples

```text
American
Chinese
Korean
Japanese
Indian
Mediterranean
Mexican
Italian
```

### Critical extraction rules

Every non-`NONE` food classification **must** preserve `food_confidence` and `food_evidence`.

Unknown remains unknown. Do **not** infer dietary compatibility from silence.

Example:

```text
Source: "Pizza will be provided."

food_status = EXPLICIT
food_items = ["pizza"]
vegetarian compatibility = UNKNOWN
```

Only mark vegetarian COMPATIBLE if the source explicitly supports it (e.g. “vegetarian pizza”, “vegetarian options available”).

Do not silently claim free food without evidence.

---

## 6.4 Uncertainty states (first-class)

These are product differentiators. UI and planner must speak them.

### Food

```text
EXPLICIT | LIKELY | POSSIBLE | NONE
```

### Dietary compatibility (per user constraint, computed at match time)

```text
COMPATIBLE
INCOMPATIBLE
UNKNOWN
```

Do **not** assume an event satisfies a dietary constraint merely because no conflicting information is present.

### Location

```text
RESOLVED
PARTIAL
UNKNOWN
```

### Registration

```text
NOT_REQUIRED
REQUIRED
UNKNOWN
```

Planner may **penalize** uncertainty. It must not eliminate an event solely for UNKNOWN unless a hard constraint says so (e.g. `allow_possible_food = false` combined with POSSIBLE food).

UI copy examples:

```text
Vegetarian options not confirmed
Food is likely, but not explicitly guaranteed
RSVP requirement unclear
```

---

## 6.5 User personalization model

Personalization is **P0**. It is not an optional profile screen. It must change filtering, ranking, optimization, and recommendations.

Internally, one `user_preferences` record is enough for MVP. Separate **hard** vs **soft** in code (`UserConstraints` vs `UserPreferences`) even if stored together.

```text
id
user_id                    # local anonymous id is fine for demo

# HARD-ish schedule / travel
campus_days[]              # e.g. monday, wednesday, friday
desired_meals[]            # breakfast, lunch, dinner, snacks
home_building_id
usual_building_ids[]
max_walking_minutes        # HARD cap
ideal_walking_minutes      # SOFT target

# HARD dietary constraints
dietary_constraints[]      # vegetarian, vegan, halal, kosher, gluten-free, dairy-free, nut-free, custom avoidances

# SOFT food taste
dietary_preferences[]
favorite_foods[]
disliked_foods[]
preferred_cuisines[]

preferred_meal_time_windows
minimum_food_confidence    # e.g. explicit-only
allow_likely_food
allow_possible_food

willing_to_rsvp            # yes | only_if_worth_it | no
preferred_event_types[]
disliked_event_types[]
preferred_campus_zones[]

created_at
updated_at
```

Store locally (existing `lib/storage/local-state.ts` pattern) for demo. Do not require accounts.

Architecture should allow adding more preference keys later without rewriting the planner.

---

### Hard constraints

Eliminate invalid options. Never “maybe” these away in ranking.

Examples:

- days the user will be on campus
- unavailable time windows / calendar busy (if provided)
- desired meals (event outside all requested meal windows)
- maximum walking time
- dietary constraints with **known INCOMPATIBLE** evidence
- registration deadline already passed (unless user allows expired)
- event eligibility restrictions the user fails
- temporal overlap with an already chosen event
- insufficient travel time between consecutive events
- `willing_to_rsvp = no` **and** `registration_status = REQUIRED` (chosen MVP semantics: hard exclude)
- `allow_likely_food = false` / explicit-only vs LIKELY/POSSIBLE

Dietary constraint values:

```text
vegetarian
vegan
halal
kosher
gluten-free
dairy-free
nut-free
other user-entered avoidance
```

---

### Soft preferences

Affect ranking; do not automatically remove events.

Examples:

- favorite foods
- disliked foods
- cuisine preferences
- preferred meal times
- preferred campus areas / buildings
- ideal walking distance (below the hard max)
- preference for explicit food confirmation
- willingness to attend networking / social / technical talks
- `willing_to_rsvp = only_if_worth_it` (registration friction penalty, not exclusion)
- event duration preference
- preference for higher food-confidence events
- preferred event categories

Favorite food chips (onboarding / planner):

```text
pizza
sandwiches
Asian food
Indian food
Mexican food
desserts
coffee
snacks
healthy food
```

---

## 6.6 `todos`

```text
id
user_id
event_id
type                 # RSVP | REGISTER | REMINDER
title
deadline
status               # OPEN | DONE | DISMISSED | OVERDUE
created_at
updated_at
```

Sort soonest deadline first. Surface overdue separately. Never auto-submit external RSVP forms.

---

## 6.7 `meal_plans`

```text
id
user_id
plan_date            # or plan_week_start
created_at
```

`meal_plan_items`:

```text
id
meal_plan_id
event_id
meal_type
event_score
walking_minutes_from_previous
sequence_index
positive_reasons[]
warnings[]
```

---

## 6.8 `checkins` — P2 / POST

Keep the schema for later. Do not block P0 on it.

```text
id
user_id
event_id
photo_url
dish_labels[]
availability_status    # PLENTY | SOME | GONE | UNKNOWN
points_awarded
created_at
```

---

# 7. P0 — Project Initialization

## TASK P0-001 — Initialize repository

- [x] Create Next.js + TypeScript project.
- [x] Configure Tailwind.
- [x] Add linting / formatter.
- [x] Add `.env.example`, `README.md`, this `task.md`.
- [x] Configure `@/` aliases.
- [x] Verify production build succeeds.

```bash
npm install
npm run dev
npm run build
```

---

## TASK P0-002 — Design tokens

- [x] background, card, text, border, radii, spacing, shadows, marker sizing, type hierarchy

Visual direction for **planner + map** (not a game):

```text
Apple Maps        60%
Notion            25%
soft campus       15%
```

Avoid: overly cartoonish UI as the primary surface, cluttered dashboards, spreadsheet density.

Pixel/Scotty styling may remain, but **do not let it steal the demo**. The judge should remember the plan, not the pet.

Use: rounded sheets, pill filters / chips, large touch targets, clear hierarchy, map-first composition **in service of the itinerary**.

---

# 8. P0 — Database / local repository

## TASK P0-010 — Schema

- [x] Base tables from the original Section 6.
- [x] Extend events with `food_items`, `cuisine_tags`, `dietary_tags`, `registration_status`, `location_status`, `event_types`.
- [x] Extend user preferences to the personalization model in 6.5.
- [x] Indexes on `start_time`, `food_status`, `building_id`, `source_id`, `registration_deadline`.
- [x] SQL migration scaffold exists.

Local app uses `LocalFixtureEventRepository`. Applying SQL to live Supabase still requires a human-created project.

---

## TASK P0-011 — Seed CMU buildings

- [x] GHC, Tepper, CUC, Wean, Doherty, Hunt, NSH, Hamburg Hall
- [x] aliases, lat/lng, campus / off-campus flag

Normalizer must resolve `GHC`, `Tepper`, `CUC`, `NSH`, `Wean`.

Unknown location is allowed; never assign a random building.

---

# 9. P0 — Seed / Fixture Data

## TASK P0-020 — HackCMU 2026 fixture

Use HackCMU opening materials as unstructured fixture text (not a live PDF scrape).

At least:

- [x] Friday Dinner + Sponsor Expo
- [x] Friday Midnight Cafe
- [x] Saturday Lunch
- [x] Saturday Dinner
- [x] IFM Workshop
- [x] Cursor Workshop

### Enrich for personalization demo (NEW, required)

Add or extend seeded events (fixture and/or `data/fixtures/demo-events.ts`) so the hero prompt is demonstrable:

- [x] An EXPLICIT lunch with pizza **and** explicit vegetarian language
- [x] An EXPLICIT dinner with Asian catering language
- [x] A meat-only event that vegetarian hard-filters
- [x] A pizza event with **no** dietary language (UNKNOWN vegetarian)
- [x] A LIKELY refreshments event
- [x] A future event whose RSVP deadline is **tomorrow** relative to demo date `2026-09-12`
- [x] An event > 12 minutes walk from Gates for walking-cap tests
- [x] At least one lunch and one dinner on Monday, Wednesday, and Friday of the demo week if week planning is shown (or clearly labeled “no reliable option”)

Purpose:

```text
messy source
→ semantic extraction
→ food / dietary / RSVP / time / location
→ personalized plan
```

---

## TASK P0-021 — Deterministic demo mode

```text
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_DATE=2026-09-12
```

- [x] useful events if crawling fails
- [x] map markers
- [x] lunch + dinner candidates
- [x] RSVP + deadline examples
- [x] varying food confidence
- [x] demo seeds sufficient for vegetarian / pizza / walking / weekly stories

Never depend on live third-party pages during judging.

---

# 10. P0 — Source Registry & Crawling

## TASK P0-030 — Source registry

- [x] Registry-based architecture (`lib/crawler/source-registry.ts`)

Adding a source should need configuration + parser only when necessary.

---

## TASK P0-031 — Public HTML fetcher

- [x] Fetch, timeout, status, encoding, URL, timestamp
- [x] One failed source cannot crash the crawl
- [x] Identifying user-agent when appropriate

Do not: bypass auth, anti-bot, private pages, or protected logins.

---

## TASK P0-032 — Readable text

- [x] strip nav/script/style noise; preserve headings, times, links, RSVP URLs, food phrases, venues

```ts
{ sourceUrl, title, text, links[] }
```

---

## TASK P0-033 — Playwright fallback — **P1**

- [ ] browser fetch adapter
- [ ] wait for primary content
- [ ] timeout + source error logging

Scaffold exists (`lib/crawler/playwright-fetch.ts`). Demo must not require it.

---

# 11. P0 — Grounded Event Extraction

## TASK P0-040 — Zod extraction schema

Extend the current schema. Invalid model output is rejected or repaired; never written blindly.

```ts
{
  title: string,
  startTime: string | null,
  endTime: string | null,
  venueRaw: string | null,
  room: string | null,
  organizer: string | null,
  eventTypes: string[] | null,
  food: {
    status: "EXPLICIT" | "LIKELY" | "POSSIBLE" | "NONE",
    types: string[],
    items: string[],
    cuisineTags: string[],
    dietaryTags: string[],
    confidence: number,
    evidence: string | null
  },
  registration: {
    required: boolean | null,       // maps to NOT_REQUIRED | REQUIRED | UNKNOWN
    url: string | null,
    deadline: string | null
  }
}
```

---

## TASK P0-041 — Semantic extractor

Input: source URL, page title, readable text, timezone `America/New_York`, date context.

Output: `EventExtraction[]`.

- [x] only extract events supported by source content
- [x] never invent food
- [x] copy a short food evidence phrase
- [x] distinguish explicit vs likely vs possible
- [x] null when unknown
- [x] multi-event pages
- [x] preserve registration URL
- [x] careful time normalization
- [x] extract `food_items`, `cuisine_tags`, `dietary_tags` only when sourced
- [x] never upgrade UNKNOWN dietary to COMPATIBLE

Heuristic extractor remains the demo default. `LLMEventExtractor` is optional when `EXTRACTION_PROVIDER=llm` plus `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` (IFM K2 Horizon is OpenAI-compatible).

---

## TASK P0-042 — Free-food classifier

### `EXPLICIT`

```text
"lunch provided"
"dinner will be served"
"free pizza"
"food provided"
"breakfast included"
```

### `LIKELY`

```text
"reception following"
"refreshments"
"catered reception"
```

### `POSSIBLE`

```text
"networking social"
"celebration"
```

### `NONE`

No evidence, or explicit negation (“No food will be provided”).

No evidence ⇒ cannot be `EXPLICIT`.

---

## TASK P0-042b — Food metadata extraction (NEW P0)

From the same evidence span, fill:

- `food_items[]`
- `cuisine_tags[]`
- `dietary_tags[]`

If the source only says “lunch provided”, items/cuisine/dietary stay empty; food_status can still be EXPLICIT.

---

## TASK P0-043 — Time normalization

- [x] America/New_York timezone-aware timestamps
- [x] AM/PM, noon, midnight, cross-midnight, inherited page dates
- If date cannot be supported, mark incomplete — do not invent

---

## TASK P0-044 — Location normalization

Inputs: `GHC 4307`, `Gates 4307`, `TEP 1403`, `Tepper Simmons Auditorium`, `CUC Rangos`.

Output: `building_id`, `room`, `venue_raw`, `location_status` / confidence.

Process: exact alias → normalized alias → fuzzy known building → optional AI resolver → unresolved.

---

# 12. P0 — Deduplication

## TASK P0-050 — Fingerprint

- [x] normalized title, start_time, organizer, building, source URL

## TASK P0-051 — Merge

Prefer explicit over inferred; keep registration URL; highest-confidence food evidence; canonical building; richer description; keep provenance.

Same event must not create two identical nearby map markers.

---

# 13. P0 — Event API

## TASK P0-060 — `GET /api/events`

Filters: date, start, end, food_status, meal, building.

## TASK P0-061 — Event detail

Return metadata, location, food classification **including items/cuisine/dietary tags**, evidence, registration, source, confidence.

## TASK P0-062 — `POST /api/plan` (extend)

Accept date **or week**, meals, walking, dietary constraints, favorite foods, willing_to_rsvp, etc.

Return itinerary **plus** per-event `PersonalizedEventScore` explainability.

Do not re-run the crawler or an LLM inside `/api/plan`.

---

# 14. P0 — Campus Map (visualization)

Keep map-first UX. A **simple** attractive map is P0. Impressive 3D is not.

## TASK P0-070 — Base map

- [x] CMU-centered viewport, pan, zoom, basic pitch, rotate, responsive, mobile

Do not request precise user location unless explicitly enabled.

## TASK P0-071 — Building layer

- [x] display buildings, select/name
- Sophisticated extrusion / indoor floors: **P2** — already present; do not expand

## TASK P0-072 — Food markers

Communicate meal/food type, time, confidence. Cluster if dense.

## TASK P0-073 — Event bottom sheet

- [x] title, time, building/room, walking, food status, confidence, evidence, RSVP, deadline, source, add to plan, register
- [x] dietary compatibility vs current user prefs (COMPATIBLE / INCOMPATIBLE / UNKNOWN)
- [x] warnings for likely food / unknown diet / unclear RSVP

## TASK P0-074 — Date and meal filters

- [x] Today / Tomorrow / date, Breakfast / Lunch / Dinner / Snacks, explicit-only

Changing a filter updates markers and lists immediately.

## TASK P0-075 — Plan-on-map (NEW)

When an itinerary exists, highlight selected events and, if practical, walking between them. This is more important than 3D extrusion.

---

# 15. P0 — Walking Time

## TASK P0-080

- [x] Haversine + conservative walking speed (`APP_CONFIG.walkingMetersPerMinute`, 80 m/min)
- Planner must use the same function
- Optional route API is **P1**

## TASK P0-081 — Off-campus penalty

- [x] `off_campus = true` penalized unless user allows longer travel

---

# 16. P0 — Personalization matching (NEW CORE)

Insert this layer between normalized events and the optimizer:

```text
Normalized Event
      ↓
Preference Matcher
      ↓
Personalized Candidate
      ↓
Planner / Optimizer
```

## TASK P0-200 — Preference storage + defaults

- [x] Load/save the 6.5 model in local storage
- [x] Intelligent defaults if onboarding is skipped:

```text
Today (or demo date)
Lunch + Dinner
15-minute walking max
Explicit + Likely
willing_to_rsvp = only_if_worth_it
no dietary constraints
```

---

## TASK P0-201 — Skippable onboarding

Do **not** block the map.

Step 1 — meals: Breakfast / Lunch / Dinner / Snacks  
Step 2 — dietary: Vegetarian / Vegan / Halal / Kosher / Gluten-free / None  
Step 3 — likes: Pizza / Asian / Indian / Mexican / Sandwiches / Dessert / Coffee / Healthy food  
Step 4 — walk: 5 / 10 / 15 / 20+ min  
Step 5 — RSVP: Yes / Only if worth it / No  

Allow **Skip**. Persist partial answers.

---

## TASK P0-202 — Quick chips on planner

Change prefs without visiting profile:

```text
Vegetarian
≤ 12 min walk
Lunch + Dinner
Explicit food only
```

Chips must re-run hard filter + scoring immediately.

---

## TASK P0-210 — Dietary compatibility

For each `dietary_constraints[]` item, compute:

```text
COMPATIBLE | INCOMPATIBLE | UNKNOWN
```

Rules:

- INCOMPATIBLE only with sourced conflict (e.g. “pepperoni only”, “meat-only BBQ”).
- COMPATIBLE only with sourced support (“vegetarian options available”).
- Otherwise UNKNOWN — remain visible, add warning, apply uncertainty penalty. Never claim certainty.

---

## TASK P0-220 — `PersonalizedEventScore`

```ts
PersonalizedEventScore {
  eventId
  hardConstraintPassed
  mealMatch
  foodConfidenceScore
  foodPreferenceScore
  cuisinePreferenceScore
  dietaryCompatibilityScore
  walkingScore
  scheduleFitScore
  registrationScore
  eventTypePreferenceScore
  totalScore
  positiveReasons[]
  warnings[]
  rejectionReasons[]
}
```

Reason codes must be structured (then mapped to copy). Examples:

Selected because:

- confirmed lunch
- matches vegetarian preference
- pizza is one of your favorites
- 7-minute walk
- fits your schedule

Warnings:

- RSVP required
- dietary details incomplete

Rejection:

- exceeds 12-minute walking limit
- overlaps with another selected event
- registration deadline passed
- known incompatible food option

---

# 17. P0 — Planner (personalized)

The hero feature is **personalized free-meal planning**.

The primary user question:

```text
I am on campus Monday, Wednesday, and Friday.
I want lunch and dinner.
I am vegetarian.
I like pizza and Asian food.
I don't want to walk more than 12 minutes.
I am willing to RSVP if needed.
Find the best free-food plan for me.
```

Return an itinerary, not a list.

## Three phases (explicit in code)

### PHASE 1 — Hard constraint filtering

Remove events that cannot realistically be attended:

- wrong date / not a campus day
- meal outside allowed windows
- time conflict / overlap
- walking infeasible vs `max_walking_minutes`
- required registration deadline passed
- user not eligible
- known INCOMPATIBLE dietary constraint
- `willing_to_rsvp = no` and RSVP required
- explicit-only user vs LIKELY/POSSIBLE food

### PHASE 2 — Soft scoring

Rank remaining events. Initial **MVP weights** (normalize 0–1 inputs first; treat as starting point, not sacred):

```text
score =
    food_confidence_score     * 25
  + meal_match_score          * 25
  + dietary_match_score       * 25
  + food_preference_score     * 15
  + cuisine_preference_score  * 10
  + schedule_fit_score        * 20
  + event_preference_score    * 5
  - walking_minutes           * 1.5
  - registration_friction     * 8
  - off_campus                * 15
  - uncertainty               * 10
```

Interpretation (keep previous mappings, extend):

`food_confidence`: EXPLICIT 1.0 / LIKELY 0.7 / POSSIBLE 0.35 / NONE 0  

`meal_match`: exact 1 / reasonable window 0.7 / poor 0  

`dietary_match`: COMPATIBLE 1 / UNKNOWN 0.35 / INCOMPATIBLE already filtered  

`food_preference`: overlap of `food_items` / types with favorites; disliked foods negative  

`uncertainty`: UNKNOWN diet, POSSIBLE food, UNKNOWN registration, PARTIAL location  

`registration_friction`: required + near deadline; unknown RSVP; `only_if_worth_it` medium penalty; `yes` low penalty  

Do not blindly apply raw weights without normalization.

### PHASE 3 — Itinerary optimization

Deterministic greedy / constrained selection is sufficient.

For each requested meal (and each campus day for week mode):

1. hard-filter candidates
2. score
3. pick best
4. enforce `canAttend(previous, next, walkingMinutes)`
5. continue

Do **not** implement CP-SAT before this works.

Post-hackathon: weighted interval scheduling, orienteering with time windows, CP-SAT.

---

## TASK P0-090 — Planner UI

- [x] date, meal toggles, max walking, start building, explicit vs likely
- [x] dietary chips, favorite foods, willing_to_rsvp
- [x] week vs day toggle
- [x] reasons + warnings on each selected card
- [x] “No reliable option” for a meal/day rather than a silent gap

Timeline (keep, add why):

```text
11:50  Leave Gates
12:00–1:00  🍕 ML Seminar · Tepper 1403 · Confirmed lunch
            Why: vegetarian-compatible · pizza · 8 min walk
5:20   Walk to CUC
5:30–7:00  🥡 Mixer · CUC · Asian catering
            Action: RSVP by Tuesday 11:59 PM
```

Summary: meals covered, total walking, actions required. Optional labeled $12/meal savings illustration — not factual accounting.

Plan must be understandable in under 10 seconds **and** trustworthy under inspection.

---

## TASK P0-091 — Personalized scoring

Replace the old formula (`food_confidence * 30 + meal_match * 25 + schedule_fit * 20 - walking * 1.5 - registration_risk * 10 - off_campus * 15`) with Section 17 Phase 2.

Keep the old signals; add dietary, food/cuisine preference, event-type preference, uncertainty.

---

## TASK P0-092 — Conflict detection

- [x] overlap, walking infeasibility, expired RSVP unless allowed
- [x] wire these as Phase 1 hard constraints with `rejectionReasons`

```ts
canAttend(previousEvent, nextEvent, walkingMinutes): boolean
```

---

## TASK P0-093 — Day itinerary optimizer

- [x] greedy constrained lunch/dinner
- [x] run Phase 1 → 2 → 3 using `PersonalizedEventScore`
- [x] attach explainability to every selected item

---

## TASK P0-094 — Result UI

- [x] timeline + summary
- [x] why-selected / warnings / RSVP CTA per event

---

## TASK P0-250 — Weekly planner (P0 architecture, simplified OK)

Support **Plan my week**, not only Plan today.

Input: campus days, meals, dietary, likes, max walk, willing_to_rsvp.

Output example:

```text
MONDAY
Lunch — Event A
Dinner — Event B

WEDNESDAY
Lunch — Event C
Dinner — No reliable option

FRIDAY
Lunch — Event D
Dinner — Event E

Required actions:
TODAY     Register for Event E
TOMORROW  Registration closes for Event D
```

If full joint week optimization is too heavy, implement:

- independent per-day greedy using the same matcher
- then a pass that collects RSVP actions across the week, sorted by deadline

That simplified version **is acceptable P0** if it is deterministic, explained, and demoable.

Richer joint optimization is **P1**.

---

# 18. P0 — RSVP / action workflow

This is a **core** pillar, not a side list. Value is **future** food the user would otherwise miss.

```text
Future Event Discovery
       ↓
Food Opportunity
       ↓
Registration Requirement
       ↓
Deadline
       ↓
Personalized Relevance
       ↓
Todo
       ↓
Reminder / Calendar
       ↓
Attend Event
```

## TASK P0-100 — Registration extraction

Populate `registration_required`, `registration_url`, `registration_deadline`, `registration_status`.

null required → UNKNOWN (penalty, not silent “no RSVP”).

## TASK P0-101 — Suggest To-Do from plan and event sheet

If required + deadline exists: `Register by Friday` + create/open To-Do.

Do not auto-submit external forms.

Planner should prefer events the user can still register for (`willing_to_rsvp` + deadline in the future).

## TASK P0-102 — `/todos`

- [x] event, deadline, remaining time, link, done, dismiss, soonest first
- [x] overdue state
- [x] week-plan “required actions” roll-up (today / tomorrow)

## TASK P0-103 — ICS (implemented; treat as P1 polish)

- [x] download day itinerary `.ics`
- Google OAuth remains P1 / human credentials

---

# 19. P1 — Google Calendar

## TASK P1-110 — OAuth

- [ ] configure, min scopes, server-side tokens, denied-permission UX  
ICS fallback already exists.

## TASK P1-111 / P1-112 — Add event / add day

Title includes food signal; location; description with confidence, source, registration URL. Optional “leave for building” reminder.

---

# 20. P1 — Real source coverage

## TASK P1-120 — CMU official events

- [ ] listings, detail pages, provenance, incremental crawl test  
Public adapters exist; live pages are JS-heavy / best-effort. Demo uses fixtures.

## TASK P1-121 — Department source

Pick 1–2 easy public calendars (SCS, RI, MLD, ECE, Tepper, Heinz).

## TASK P1-122 — Student-org public source only

If login required: do not bypass; document as future work.

## TASK P1-123 — Incremental crawling

- [x] hash, skip unchanged, update, `last_checked_at`, dedup

---

# 21. P2 — Map spectacle (demoted)

Do **not** spend critical remaining time here.

## TASK P2-130 — Building extrusion

- [x] already implemented in GEO mode — freeze

## TASK P2-131 — Camera transition

- [x] already implemented — freeze

Indoor floors / room GIS: P2-150 / P2-151 remain non-goals for the 24-hour MVP. A polished outdoor map beat a half-working indoor GIS; a **working planner** now beats both.

---

# 22. P2 — Photo, community, gamification (demoted)

Existing Scotty / Food Dex / mock vision / NOW GOING / points / fake leaderboard: **freeze**. Do not add features.

## TASK P2-140 — Photo upload / dish recognition

Mock path exists. Real vision is POST. Require user confirmation before labels are final **if** revisited later.

## TASK P2-142 — Live leftover reports

Community remaining-food is a future extension. It must not compete with planner P0.

## TASK P2-143 / P2-144 — Points, leaderboard, badges

POST / P2. Do not build more before the planner is the demo hero.

---

# 23. Error Handling

## Crawling

- [x] isolate source failures, log HTTP/extraction, source health in lab/dev

## Extraction

- [x] malformed JSON fails validation
- [x] missing date not fabricated
- [x] missing location unresolved
- [x] weak food hint not upgraded to EXPLICIT
- [x] empty dietary tags ≠ COMPATIBLE

## Planner

- [x] empty candidates friendly state
- [x] impossible meal combo explained
- [x] past RSVP visible; walking infeasibility respected
- [x] UNKNOWN diet warning; “no reliable option” per meal/day

## UI

- [x] loading / empty / error / demo fallback

---

# 24. Testing

Keep existing extraction / time / conflict / integration tests.

## TASK P0-160 — Food classification

```text
"Lunch will be provided."         → EXPLICIT
"Free pizza after the talk."      → EXPLICIT
"Refreshments will be served."    → LIKELY
"Reception follows."              → LIKELY
"Networking event."               → POSSIBLE or NONE
"No food will be provided."       → NONE
```

Include negation. Add: pizza without vegetarian language does **not** set vegetarian dietary_tag.

## TASK P0-161 — Time normalization

noon, midnight, AM/PM, cross-midnight, date from heading.

## TASK P0-162 — Planner conflicts

overlap, insufficient walk, back-to-back same building, expired registration, off-campus, no lunch candidate.

## TASK P0-163 — Integration

```text
HackCMU fixture → extraction → normalization → repository-shaped event → planner candidate
```

Extend: matcher + explanations on the resulting plan.

---

## TASK P0-164 — Personalization unit tests (NEW P0)

1. User vegetarian + explicitly meat-only event → **hard rejection**.
2. User vegetarian + “pizza provided” (no diet language) → **not COMPATIBLE**; UNKNOWN warning.
3. User likes pizza; Event A pizza vs Event B sandwiches; else equal → **A ranks higher**.
4. Max walking 10 min; event 15 min away → **rejected**.
5. `willing_to_rsvp = no`; Event A RSVP required vs Event B none → **A excluded** (MVP hard-filter semantics).
6. `minimum_food_confidence = explicit only`; LIKELY event → **filtered**.
7. Two equal-quality events → **closer ranks higher**.

Also: toggling a planner chip changes the itinerary deterministically.

---

# 25. Analytics / Debugging for Demo

Dev-only lab can show: source, extraction status, food confidence, location resolution, last crawl, **active preference snapshot**, **hard-reject counts**.

Do not dump internals on the consumer map.

`/profile` already exposes source health and LLM connection status — keep that as judge bait for extraction, not as the product.

---

# 26. Security & Privacy

- [x] No Google OAuth secrets client-side; service-role server-side
- [x] Validate image MIME/size if upload exists
- [x] Avoid unnecessary precise location
- [x] Do not auto-register users for external events
- [x] Do not scrape authenticated/private pages
- [x] Treat source HTML as untrusted; never unsanitized render
- Preferences stay local unless the user later opts into an account

---

# 27. UX Requirements

## Home / map

Still answers “where is food **today**?” as a **discovery surface**.

Above the fold: map, date, markers, upcoming opportunities.

Do not make this the entire pitch.

## Planner (hero)

Must answer:

```text
Given who I am, where I will be, what I eat, and what I am willing to do,
what is the best free-food plan for my day or week?
```

Do not force a 15-field form before the app works. Chips + skippable onboarding.

## Event detail / trust

Most important trust element remains:

```text
Why does the app think food exists?
Confirmed food · 98% · “Lunch will be provided.”
```

Add: dietary UNKNOWN warning, RSVP clarity, why-selected when the event is in a plan.

---

# 28. Accessibility

- [x] not color-only markers, ARIA, contrast, keyboard cards, reduced motion, adequate touch targets
- Reason lists must be text, not color dots alone

---

# 29. Performance

- [x] map not blocked by AI/crawl
- [x] planner uses structured data, not a fresh LLM call
- [x] fixture/offline path for judging

**The user should never wait for the crawler just to use the map or generate a plan from seeded events.**

---

# 30. Remaining execution order (given current repo)

Foundation hours 0–17 equivalent work already exists. Remaining hackathon time:

## Block A — Data model + fixtures

- extend event + preference types
- enrich demo events for vegetarian / pizza / Asian / walking / Friday RSVP
- tests for metadata extraction

## Block B — Matcher + hard filter + new scores

- dietary compatibility
- PersonalizedEventScore
- replace `/api/plan` scoring
- unit tests P0-164

## Block C — Explainability UI + chips + onboarding

- reasons/warnings on itinerary
- planner chips
- skippable onboarding that writes the same store

## Block D — Week + RSVP roll-up

- `build-week.ts` per-day greedy + action list
- overdue / today-tomorrow required actions

## Block E — Freeze

- bugfixes, fixture reliability, demo rehearsal
- **do not** add 3D, Scotty features, or live leftover social

If time remains: P1 extra public source or ICS copy polish — not gamification.

---

# 31. Demo Script (rewrite)

Target ≤ 3 minutes. Center **intelligence and actionability**, not “look at our 3D map.”

## 0:00–0:25 — Problem

> CMU has free food everywhere, but the information is fragmented across department pages, club events, company talks, calendars, and PDFs.

## 0:25–0:55 — Agent extraction

Show a messy source, e.g.:

```text
Machine Learning Seminar
Friday 12 PM
Gates 4307
Lunch provided
Vegetarian options available
RSVP by Thursday
```

Then structured output: Lunch · Gates 4307 · 98% · vegetarian compatible · RSVP Thursday. **Show evidence.**

## 0:55–1:20 — Personalization

```text
Monday / Wednesday / Friday
Lunch + Dinner
Vegetarian
Likes pizza + Asian food
Max walk 12 minutes
Willing to RSVP
```

Flip one chip (vegetarian or 12 min) so judges see the plan change.

## 1:20–2:05 — Planner

Click **PLAN MY WEEK**. For each event: meal, food, walk, preference match, confidence, **reason selected**.

## 2:05–2:30 — RSVP

> Register for Friday dinner by tomorrow.

Add to To-Do.

## 2:30–2:50 — Map

Show the itinerary spatially. One pan/zoom. Do not linger on 3D.

## 2:50–3:00 — Close

> ScottyBites doesn’t just tell you where food is. It plans your week around it.

Alternative:

> Find tomorrow’s free food today.

---

# 32. Judge-facing technical story

When asked “Where is the technical difficulty?”, explain:

1. **Heterogeneous information extraction** — HTML, PDF/fixture, listings, department/club pages.
2. **Grounded semantic understanding** — food detection, evidence, food type/items, dietary metadata, registration, deadline.
3. **Entity normalization** — time, location, CMU aliases, dedup.
4. **Personalization** — hard dietary/schedule/walk/RSVP constraints vs soft cuisine/food preferences.
5. **Spatiotemporal optimization** — meal windows, overlap, walking, future RSVP, off-campus penalty.
6. **Explainability + uncertainty** — why selected; what is unknown.
7. **Actionability** — RSVP Todo, weekly plan, calendar/ICS.

Do **not** pitch primarily as a map, an LLM wrapper, or a free-food alert app.

This is substantially more than a chat UI around an LLM: the optimizer and matcher never call an LLM.

---

# 33. Agent / Cursor working rules

## Before starting a task

1. Read this entire `task.md`.
2. Identify the next **unchecked P0** with the highest priority (personalization / matcher / week / explainability before any P2).
3. Inspect existing files. The skeleton already works — extend it.
4. Do not rewrite working unrelated modules (especially Scotty, pixel map internals, 3D extrusion).
5. State the implementation plan briefly.

## While implementing

- Prefer small, composable modules.
- TypeScript strict typing.
- Validate external/AI data with Zod.
- Run tests/build after meaningful changes.
- Do not add dependencies without a clear reason.
- Do not silently change schema semantics.
- Preserve provenance and food evidence.
- Do not fabricate missing source facts.
- Do not make the UI depend on a live crawler.
- Do not use an LLM for scoring, matching, or conflict detection.
- Hard vs soft must stay distinct in code.

## After a task

1. Run relevant tests.
2. Run lint/typecheck.
3. Update checkboxes only if acceptance criteria are met.
4. Note limitations under the task if needed.
5. Do not mark partially working tasks complete.

---

# 34. Suggested Cursor model strategy

**Cursor Grok 4.6 — High:** multi-file planner/personalization implementation, itinerary UI.

**GPT-5.6 Sol:** matcher/optimizer correctness, schema, hard debugging.

**Composer 2.5:** chips CSS, copy, small tests.

```text
Grok 4.6 High
  ↓ implement personalization vertical slice
GPT-5.6 Sol
  ↓ audit matcher + scores + tests
Composer 2.5
  ↓ UI polish
```

---

# 35. Next Cursor prompt — Personalization vertical slice

Paste after this `task.md` update:

```text
Read task.md completely before making changes.

Do not rebuild the Next.js skeleton, map, crawler, or Scotty/gamification.

Implement the remaining P0 personalization vertical slice:

1. Extend event + user preference types (food_items, cuisine_tags, dietary_tags, hard vs soft prefs).
2. Enrich demo fixtures so vegetarian / pizza / Asian / walking / RSVP-deadline stories work.
3. Dietary compatibility COMPATIBLE | INCOMPATIBLE | UNKNOWN (never infer from silence).
4. Preference matcher → PersonalizedEventScore with reasons / warnings / rejections.
5. Planner Phase 1 hard filter → Phase 2 scores → Phase 3 greedy itinerary.
6. Explainability on the Plan UI + compact preference chips.
7. Skippable onboarding writing the same preference store.
8. Simplified weekly planner + RSVP action roll-up.
9. Unit tests in TASK P0-164.

Do not implement P2 photo, points, 3D, or indoor maps.
Do not use an LLM inside the optimizer.
Run lint, typecheck, tests when done.
Update task.md checkboxes only when acceptance criteria are truly met.
```

---

# 36. Follow-up Cursor prompt — Week + demo freeze

```text
Continue from task.md.

Polish Plan my week, required-action To-Dos, map highlight of the itinerary, and demo fixtures.

Rehearse the 3-minute script in section 31.

Do not add gamification or 3D work.
```

---

# 37. Pre-demo checklist

## Data

- [x] seeded fallback
- [ ] one live public source (best-effort; not required)
- [x] HackCMU fixture
- [x] evidence visible
- [x] personalization demo events (veg / pizza / walk / future RSVP)

## Map

- [x] opens at CMU, markers, filters, no token errors, mobile
- [x] selected itinerary visible on map

## Personalization / planner

- [x] lunch + dinner candidates, realistic walks, no overlaps, deterministic day plan
- [x] vegetarian changes ranking/eligibility
- [x] favorites change ranking
- [x] max walk changes itinerary
- [x] reasons on every selected event
- [x] UNKNOWN diet warning
- [x] week plan or clearly simplified per-day week

## RSVP

- [x] at least one RSVP event, deadline, To-Do
- [x] week required-actions (today / tomorrow)

## Deployment

- [x] production build, demo mode, `.env.example`
- [ ] deployment URL (human Vercel login)

## Presentation

- [ ] 3-minute rehearsal of the **new** narrative
- [ ] extraction evidence
- [ ] personalization chip flip
- [ ] optimization + explainability
- [ ] RSVP action
- [ ] close on planning, not the map

---

# 38. Explicit non-goals for remaining MVP time

Do not spend critical time on:

- native iOS / Android
- indoor navigation / every CMU floor
- autonomous RSVP form submission
- authenticated scraping workarounds
- social network, points economy, leaderboards
- live leftover radar as the pitch
- advanced recommendation ML / “more like this” training
- production-scale distributed crawler
- perfect campus routing / CP-SAT before greedy+matcher works
- further 3D campus work

---

# 39. Post-hackathon roadmap

## Phase A — Reliability

source monitoring, crawl retry, source-specific adapters, extraction eval set, human correction, event expiration

## Phase B — Deeper personalization

class schedule import, Google Calendar **read**, attendance history, learned travel tolerance, “more like this / less like this” **without** claiming a trained recommender on day one

Adaptive learning from saves, attendance, photos, rejected recs is **P2/POST**. Initial personalization stays deterministic.

## Phase C — Community (after planner is the product)

verified check-ins, photo recognition, live food status, reputation, anti-spam, badges

## Phase D — Campus GIS

route graph, entrances, accessibility, indoor floors, room-level nav

## Phase E — Expansion

Pitt and other universities; reusable source adapters; school-specific maps and aliases

---

# 40. Final product principle

ScottyBites should answer:

**Not:** “Where is free food?”

**But:** “Given who I am, where I will be, what I eat, and what I am willing to do, what is the best free-food plan for my day or week?”

When choosing between two features, pick the one that strengthens:

```text
DISCOVER → UNDERSTAND → PERSONALIZE → OPTIMIZE → ACT
```

The core differentiator is not a list of free food, a 3D campus, or a pet.

It is:

> **An agent that transforms fragmented campus information into a trusted, personalized, location-aware free-food plan — with evidence, uncertainty, and an RSVP the user can actually complete.**
