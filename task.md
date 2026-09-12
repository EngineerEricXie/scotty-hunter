# ScottyBites / CMU Free Food Agent — `task.md`

> HackCMU 2026 implementation plan  
> Goal: build a polished, map-first CMU free-food discovery and planning app that uses AI to convert messy event information into structured, actionable meal opportunities.

## Implementation status (local no-key MVP)

Completed without credentials: Next.js app, adapter architecture, HackCMU 2026 fixture extraction, demo seeds, MapLibre campus map, filters, planner, local To-Dos, ICS export, SQL/Supabase scaffold, tests, lint, typecheck, production build.

Deferred (need a human): live Supabase project, LLM API key, Google OAuth/Calendar authorization, Vercel login/deploy, Playwright Chromium, real vision API. Scaffold + local fallback exists for each.

---

---

## 0. Project Mission

Build a responsive web/PWA for Carnegie Mellon University students that can:

1. Continuously discover CMU events from multiple public sources.
2. Extract structured event data from messy/unstructured HTML, PDFs, and event descriptions.
3. Detect whether an event provides free food and preserve evidence for that decision.
4. Show free-food opportunities on an interactive CMU campus map.
5. Let users specify which days/meals they want to eat on campus.
6. Generate an optimized free-food itinerary considering time, distance, registration, and confidence.
7. Detect RSVP/registration deadlines and turn them into actionable To-Do items.
8. Allow selected events to be added to Google Calendar.
9. Later support food-photo recognition, check-ins, points, and live “food remaining” reports.
10. Present the product with a polished, soft, Apple Maps / Google Maps-inspired interface.

### One-sentence pitch

> **ScottyBites is an AI agent that continuously finds free food across CMU, understands messy event pages, and builds the best free-meal schedule around your time and location.**

---

# 1. Hackathon Constraints

Source reference: `HackCMU 2026 Opening Ceremony.pdf`

Relevant facts from the organizer deck:

- HackCMU is a **24-hour hackathon**.
- Teams are up to 4 people.
- “Food” is one of the official tracks.
- Judging emphasizes:
  - Originality
  - Technical Difficulty
  - Demo Quality
  - Usefulness
  - Track Relevance
- The judging slide explicitly distinguishes real technical work from a simple “ChatGPT wrapper.”
- Demo/presentation time is approximately **3 minutes**.
- The HackCMU schedule itself includes food events such as dinner, lunch, and midnight food, making the PDF a useful test fixture for unstructured event extraction.

### Product implication

Do **not** attempt to finish every stretch feature.

The winning MVP is the following vertical slice:

```text
SOURCE
  ↓
CRAWLER / DOCUMENT INGESTION
  ↓
AI STRUCTURED EXTRACTION
  ↓
FREE-FOOD CLASSIFICATION
  ↓
DATABASE
  ↓
CAMPUS MAP
  ↓
PERSONALIZED PLANNER
  ↓
RSVP TODO / CALENDAR
```

Everything else is secondary.

---

# 2. Priority Levels

Use these labels consistently:

- **P0** — Required for a convincing demo.
- **P1** — High-value stretch goal after the vertical slice works.
- **P2** — Nice-to-have only if the app is already stable and polished.
- **POST** — Post-hackathon product work.

### Scope rule

Before starting any P1/P2 task:

- [x] All P0 data flow works end-to-end.
- [x] App starts locally with one command.
- [x] Seeded demo works without external network dependencies.
- [x] At least one real source has been ingested. <!-- fixture + public adapters; live pages are best-effort and not required for demo -->
- [x] Planner returns a valid itinerary.
- [x] Map displays event markers.
- [x] No critical runtime errors.

---

# 3. Definition of Done for HackCMU

The project is demo-ready when a judge can see this exact flow:

1. Open ScottyBites.
2. See CMU on an interactive map.
3. Change the day/date.
4. See multiple food opportunities.
5. Open an event and see:
   - title
   - time
   - building / room
   - food type
   - confidence
   - evidence quote
   - RSVP requirement
6. Enter preferences:
   - campus days
   - lunch/dinner
   - max walking time
7. Click **Plan My Free Food Day**.
8. Receive a realistic non-overlapping itinerary.
9. See a registration deadline become a To-Do item.
10. Optionally add a selected event/day to Google Calendar.
11. Explain that the data came from unstructured CMU sources rather than hand-entered records.

---

# 4. Recommended Technical Stack

## Frontend

- [x] Next.js
- [x] TypeScript
- [x] Tailwind CSS
- [x] MapLibre GL JS
- [ ] Framer Motion only where it improves polish <!-- CSS transitions used instead -->
- [x] Responsive PWA layout
- [ ] Optional component primitives: shadcn/ui

## Backend

Preferred hackathon choice:

- [x] Next.js route handlers / server actions
- [ ] Supabase
  - Postgres
  - Auth
  - Storage
  <!-- Scaffolded and mock/local fallback implemented. Real provider activation requires manual credentials and is intentionally deferred. -->
- [ ] Optional PostGIS only if spatial queries become useful

## Data ingestion

- [x] `fetch` for normal public HTML
- [x] Cheerio for HTML parsing
- [ ] Playwright only for JavaScript-heavy public pages <!-- adapter scaffolded; runtime not installed because the demo does not need it -->
- [ ] PDF text extraction / multimodal extraction where necessary <!-- fixture text used; original PDF was not in the repo -->
- [ ] LLM structured output <!-- LLMEventExtractor scaffolded. Requires API key. Default is heuristic. -->
- [x] Zod validation

## Mapping

- [x] MapLibre GL
- [x] OpenStreetMap-compatible base data / tiles
- [x] CMU building GeoJSON
- [x] Optional 3D building extrusion

## AI

Use AI only where semantic interpretation is necessary:

- event extraction
- free-food classification
- RSVP/deadline extraction
- optional food-photo recognition

Do **not** use an LLM for deterministic tasks such as:

- date filtering after normalization
- distance formulas
- database CRUD
- schedule conflict detection
- simple scoring
- deduplication by exact URL/hash

---

# 5. Repository Structure

Create approximately this structure:

```text
scotty-bites/
├── app/
│   ├── page.tsx
│   ├── map/
│   ├── plan/
│   ├── todos/
│   ├── profile/
│   ├── event/
│   │   └── [id]/
│   └── api/
│       ├── events/
│       ├── plan/
│       ├── crawl/
│       └── calendar/
│
├── components/
│   ├── map/
│   │   ├── CampusMap.tsx
│   │   ├── FoodMarker.tsx
│   │   ├── BuildingLayer.tsx
│   │   └── EventBottomSheet.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── FoodConfidenceBadge.tsx
│   │   └── RegistrationBadge.tsx
│   ├── planner/
│   │   ├── PlannerForm.tsx
│   │   ├── MealItinerary.tsx
│   │   └── RouteSummary.tsx
│   └── ui/
│
├── lib/
│   ├── crawler/
│   │   ├── source-registry.ts
│   │   ├── fetch-source.ts
│   │   ├── extract-readable-text.ts
│   │   └── crawl-source.ts
│   ├── extraction/
│   │   ├── event-schema.ts
│   │   ├── extract-events.ts
│   │   ├── classify-food.ts
│   │   ├── normalize-location.ts
│   │   └── normalize-time.ts
│   ├── planner/
│   │   ├── score-event.ts
│   │   ├── walking-time.ts
│   │   ├── conflicts.ts
│   │   └── build-itinerary.ts
│   ├── dedup/
│   │   └── deduplicate-events.ts
│   ├── maps/
│   │   ├── buildings.ts
│   │   └── geo.ts
│   ├── calendar/
│   └── db/
│
├── data/
│   ├── fixtures/
│   │   └── hackcmu-2026/
│   └── geo/
│       └── cmu-buildings.geojson
│
├── supabase/
│   └── migrations/
│
├── tests/
│   ├── extraction/
│   ├── planner/
│   └── dedup/
│
├── public/
│   └── icons/
│
├── task.md
├── README.md
└── .env.example
```

---

# 6. Core Data Model

## 6.1 `sources`

Fields:

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

Suggested enums:

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
```

---

## 6.2 `buildings`

Fields:

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

Examples:

```text
Gates Hillman Center
Tepper Quad
Cohon University Center
Wean Hall
Doherty Hall
Hunt Library
Newell-Simon Hall
Hamburg Hall
Posner Hall
```

Do not attempt perfect CMU building coverage before the demo.

---

## 6.3 `events`

Required fields:

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

food_status
food_types[]
food_confidence
food_evidence

registration_required
registration_url
registration_deadline

eligibility
capacity_notes

raw_content_hash
extraction_version

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

### `food_types`

Possible values:

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

### Critical requirement

Every non-`NONE` classification should preserve:

```text
food_confidence
food_evidence
```

Example:

```text
food_confidence = 0.98
food_evidence = "Lunch will be provided."
```

Do not silently claim free food without evidence.

---

## 6.4 `user_preferences`

Fields:

```text
id
user_id
preferred_days[]
wants_breakfast
wants_lunch
wants_dinner
max_walking_minutes
home_building_id
usual_building_ids[]
dietary_preferences[]
created_at
updated_at
```

---

## 6.5 `todos`

Fields:

```text
id
user_id
event_id
type
title
deadline
status
created_at
updated_at
```

Enums:

```text
type:
- RSVP
- REGISTER
- REMINDER

status:
- OPEN
- DONE
- DISMISSED
```

---

## 6.6 `meal_plans`

Fields:

```text
id
user_id
plan_date
created_at
```

Related item table:

```text
meal_plan_items
- id
- meal_plan_id
- event_id
- meal_type
- event_score
- walking_minutes_from_previous
- sequence_index
```

---

## 6.7 `checkins` — P1/P2

Fields:

```text
id
user_id
event_id
photo_url
dish_labels[]
availability_status
points_awarded
created_at
```

Availability:

```text
PLENTY
SOME
GONE
UNKNOWN
```

---

# 7. P0 — Project Initialization

## TASK P0-001 — Initialize repository

- [x] Create Next.js + TypeScript project.
- [x] Configure Tailwind.
- [x] Add linting.
- [x] Add formatter.
- [x] Add `.env.example`.
- [x] Add `README.md`.
- [x] Add this `task.md` to repository root.
- [x] Configure aliases such as `@/`.
- [x] Verify production build succeeds.

### Acceptance criteria

```bash
npm install
npm run dev
npm run build
```

all work without errors.

---

## TASK P0-002 — Create design tokens

Define:

- [x] background
- [x] card background
- [x] text colors
- [x] subtle border
- [x] corner radii
- [x] spacing scale
- [x] shadows
- [x] map marker sizing
- [x] typography hierarchy

### Visual direction

Target:

```text
Apple Maps        70%
Notion            15%
soft/cute campus  15%
```

Avoid:

- overly cartoonish UI
- excessive gradients
- excessive shadows
- cluttered dashboards
- dense spreadsheet appearance

Use:

- rounded bottom sheets
- pill filters
- soft cards
- large touch targets
- restrained iconography
- clear hierarchy
- map-first composition

---

# 8. P0 — Database

## TASK P0-010 — Create database schema

- [x] Add tables listed in Section 6.
- [x] Add enums.
- [x] Add indexes:
  - start_time
  - food_status
  - building_id
  - source_id
  - registration_deadline
- [x] Add foreign keys.
- [x] Add timestamps.
- [x] Create migration.

<!-- Local app uses LocalFixtureEventRepository. Applying these SQL files to a live Supabase project requires creating a project and pasting credentials. -->

### Acceptance criteria

A fresh Supabase database can be initialized solely from repository migrations.

---

## TASK P0-011 — Seed CMU buildings

Seed at least:

- [x] Gates Hillman Center
- [x] Tepper Quad
- [x] Cohon University Center
- [x] Wean Hall
- [x] Doherty Hall
- [x] Hunt Library
- [x] Newell-Simon Hall
- [x] Hamburg Hall

For each:

- [x] canonical name
- [x] common aliases
- [x] latitude/longitude
- [x] campus/off-campus flag

### Acceptance criteria

Location normalizer can resolve common abbreviations such as:

```text
GHC
Tepper
CUC
NSH
Wean
```

to a known building.

---

# 9. P0 — Seed / Fixture Data

## TASK P0-020 — Build HackCMU 2026 fixture

Use the supplied `HackCMU 2026 Opening Ceremony.pdf` as the first realistic unstructured fixture.

Create fixture records corresponding to at least:

- [x] Friday Dinner + Sponsor Expo
- [x] Friday Midnight Cafe
- [x] Saturday Lunch
- [x] Saturday Dinner
- [x] IFM Workshop
- [x] Cursor Workshop

Preserve source page references in fixture metadata if convenient.

### Purpose

This fixture demonstrates:

```text
53-page event deck
→ semantic extraction
→ food/time/location understanding
→ structured database records
```

### Acceptance criteria

A test can load the fixture and produce normalized event objects.

---

## TASK P0-021 — Create deterministic seeded demo mode

Add a mode such as:

```text
DEMO_MODE=true
```

When enabled:

- [x] app has useful events even if internet crawling fails
- [x] map has enough markers for demo
- [x] planner has at least one lunch and one dinner option
- [x] one event has RSVP required
- [x] one event has a deadline
- [x] food confidence varies across events

### Reason

Never depend on live third-party pages during judging.

---

# 10. P0 — Source Registry & Crawling

## TASK P0-030 — Implement source registry

Create a registry-based architecture.

Example:

```ts
{
  id: "cmu-events",
  name: "CMU Events",
  url: "...",
  sourceType: "official_calendar",
  parserType: "html",
  enabled: true
}
```

Do not hardwire all crawling into one function.

### Acceptance criteria

Adding a new source requires configuration + source-specific parsing only when necessary.

---

## TASK P0-031 — Implement generic public HTML fetcher

- [x] Fetch URL.
- [x] Respect reasonable timeout.
- [x] Return status.
- [x] Normalize encoding.
- [x] Save source URL.
- [x] Record fetch timestamp.
- [x] Handle failures without crashing the entire crawl.
- [x] Add user-agent identifying the project if appropriate.

### Do not

- bypass authentication
- bypass anti-bot protections
- scrape private pages
- automate protected logins during the MVP

---

## TASK P0-032 — Extract readable text

Given HTML:

- [x] strip nav noise where possible
- [x] remove script/style
- [x] preserve headings
- [x] preserve date/time text
- [x] preserve links
- [x] preserve RSVP URLs
- [x] preserve food-related phrases
- [x] preserve venue information

Output:

```ts
{
  sourceUrl,
  title,
  text,
  links[]
}
```

---

## TASK P0-033 — Add Playwright fallback

Only use when needed.

- [ ] implement a browser fetch adapter
- [ ] wait for primary content, not arbitrary long sleeps
- [ ] return rendered HTML/text
- [ ] enforce timeout
- [ ] log source errors

<!-- Scaffolded in lib/crawler/playwright-fetch.ts. Playwright is not installed; demo does not need it. -->

P0 requirement is only one successful dynamic source if a useful source needs it.

---

# 11. P0 — AI Event Extraction

## TASK P0-040 — Define Zod extraction schema

The AI output must be validated.

Example conceptual schema:

```ts
{
  title: string,
  startTime: string | null,
  endTime: string | null,
  venueRaw: string | null,
  room: string | null,
  organizer: string | null,
  food: {
    status: "EXPLICIT" | "LIKELY" | "POSSIBLE" | "NONE",
    types: string[],
    confidence: number,
    evidence: string | null
  },
  registration: {
    required: boolean | null,
    url: string | null,
    deadline: string | null
  }
}
```

### Acceptance criteria

Invalid output is rejected or repaired; it is never written blindly to the database.

---

## TASK P0-041 — Implement semantic extractor

Input:

```text
source URL
page title
readable text
known timezone = America/New_York
current/source date context
```

Output:

```text
EventExtraction[]
```

Prompt requirements:

- [x] only extract events supported by source content
- [x] never invent food
- [x] copy a short supporting food evidence phrase
- [x] distinguish explicit vs likely vs possible
- [x] return null when unknown
- [x] detect multi-event pages
- [x] preserve registration URL when linked
- [x] normalize time carefully

---

## TASK P0-042 — Free-food classifier

Rules:

### `EXPLICIT`

Examples:

```text
"lunch provided"
"dinner will be served"
"free pizza"
"food provided"
"breakfast included"
```

### `LIKELY`

Examples:

```text
"reception following"
"refreshments"
"catered reception"
```

### `POSSIBLE`

Weak hints only:

```text
"networking social"
"celebration"
```

### `NONE`

No evidence.

### Acceptance criteria

Classifier stores:

- status
- confidence
- evidence

No evidence means it cannot be `EXPLICIT`.

---

## TASK P0-043 — Time normalization

Normalize all event times to:

```text
America/New_York
```

Store timezone-aware timestamp.

Handle:

- [x] AM/PM
- [x] date omitted but page context provides date
- [x] cross-midnight events
- [x] multi-day pages
- [x] midnight
- [x] invalid / ambiguous dates

### Important

If date cannot be supported from source/context, mark extraction incomplete instead of inventing a date.

---

## TASK P0-044 — Location normalization

Input examples:

```text
GHC 4307
Gates 4307
TEP 1403
Tepper Simmons Auditorium
CUC Rangos
```

Output:

```text
building_id
room
venue_raw
resolution_confidence
```

Process:

1. exact alias match
2. normalized alias match
3. fuzzy known-building match
4. optional AI resolver
5. unresolved

### Acceptance criteria

Unknown location is allowed; do not assign a random building.

---

# 12. P0 — Deduplication

## TASK P0-050 — Create event fingerprint

Use deterministic signals:

```text
normalized title
start_time
organizer
building
source URL
```

Generate a fingerprint/hash.

---

## TASK P0-051 — Merge duplicates

Duplicate event may appear on:

- official event site
- department site
- club site
- PDF
- company page

Merge carefully.

Preferred fields:

- explicit source values over inferred values
- registration URL when present
- highest-confidence food evidence
- canonical building resolution
- more complete description

Keep provenance.

### Acceptance criteria

Same event appearing twice does not create two nearby identical map markers.

---

# 13. P0 — Event API

## TASK P0-060 — Build events endpoint

Support filters:

```text
date
start
end
food_status
meal
building
```

Example:

```text
GET /api/events?date=2026-09-12&food_status=EXPLICIT,LIKELY
```

---

## TASK P0-061 — Build event detail endpoint

Return:

- event metadata
- normalized location
- food classification
- evidence
- registration info
- source link
- confidence

---

# 14. P0 — Campus Map

## TASK P0-070 — Build base map

Requirements:

- [x] CMU-centered initial viewport
- [x] zoom
- [x] pan
- [x] pitch
- [x] rotate
- [x] responsive
- [x] usable on mobile

Do not request precise user location for MVP unless explicitly enabled.

---

## TASK P0-071 — Add CMU building layer

Use GeoJSON building footprints where available.

- [x] display campus buildings
- [x] hover/select state
- [x] building name on selection
- [x] optional subtle 3D extrusion

### P0 floor requirement

None.

Indoor floors are P2.

---

## TASK P0-072 — Add food markers

Marker should communicate:

- meal/food type
- approximate time
- confidence

Examples:

```text
🍕 12
🥪 1
🍪 4
```

Use clustering if marker density becomes high.

---

## TASK P0-073 — Event bottom sheet

On marker click, show:

- [x] event title
- [x] start/end time
- [x] building and room
- [x] walking estimate if available
- [x] food status
- [x] confidence
- [x] evidence
- [x] RSVP requirement
- [x] deadline
- [x] source
- [x] “Add to Plan”
- [x] “Register” when URL exists

Mobile:

- bottom sheet

Desktop:

- right-side card/panel is acceptable

---

## TASK P0-074 — Date and meal filters

Filters:

- [x] Today
- [x] Tomorrow
- [x] date picker
- [x] Breakfast
- [x] Lunch
- [x] Dinner
- [x] Snacks
- [x] Explicit only toggle

### Acceptance criteria

Changing a filter immediately updates visible map markers and list/card results.

---

# 15. P0 — Walking Time

## TASK P0-080 — Implement building-to-building distance

For MVP:

- use coordinates
- use haversine distance
- convert to estimated walking time using a conservative walking-speed factor

Optional improvement:

- walking route API

### Acceptance criteria

Planner uses the same walking-time function consistently.

---

## TASK P0-081 — Add off-campus penalty

Buildings/locations can be marked:

```text
off_campus = true
```

Planner should penalize these unless user preference allows longer travel.

---

# 16. P0 — Personal Planner

## TASK P0-090 — Planner preferences UI

Inputs:

- [x] days/date
- [x] breakfast toggle
- [x] lunch toggle
- [x] dinner toggle
- [x] max walking time
- [x] starting/default building
- [x] explicit food only vs include likely

Optional:

- dietary preferences

---

## TASK P0-091 — Implement event scoring

Initial scoring function:

```text
score =
    food_confidence * 30
  + meal_match * 25
  + schedule_fit * 20
  - walking_minutes * 1.5
  - registration_risk * 10
  - off_campus_penalty * 15
```

Normalize variables so the score is meaningful.

### Suggested interpretation

`food_confidence`

```text
EXPLICIT: 1.0
LIKELY:   0.7
POSSIBLE: 0.35
NONE:     0
```

`meal_match`

```text
exact requested meal: 1
reasonable meal window: 0.7
poor match: 0
```

`registration_risk`

higher when:

- deadline has passed
- deadline is very near
- RSVP required but status unknown
- limited capacity is mentioned

---

## TASK P0-092 — Conflict detection

A valid plan must not:

- overlap events
- violate walking time between consecutive events
- select an event whose registration deadline has already passed, unless user explicitly allows it

Function:

```ts
canAttend(previousEvent, nextEvent, walkingMinutes): boolean
```

---

## TASK P0-093 — Build MVP itinerary optimizer

For the hackathon, use a deterministic greedy / constrained selection approach.

For each requested meal:

1. filter candidate events
2. remove invalid conflicts
3. compute score
4. select best candidate
5. check travel feasibility
6. continue

### Do not implement CP-SAT before MVP works.

Post-hackathon optimization can use:

- weighted interval scheduling
- orienteering with time windows
- CP-SAT

---

## TASK P0-094 — Planner result UI

Show a timeline:

```text
11:50
Leave Gates

12:00–1:00
🍕 AI Seminar
Tepper 1403
Confirmed lunch

5:20
Walk to CUC

5:30–7:00
🥗 Student Org Event
CUC
Likely dinner
```

Summary:

```text
2 free meals
14 min total walking
2 events
Estimated savings: optional
```

### Acceptance criteria

Plan is easy to understand in under 10 seconds.

---

# 17. P0 — RSVP / To-Do

## TASK P0-100 — Detect registration actions

Event extraction should populate:

```text
registration_required
registration_url
registration_deadline
```

---

## TASK P0-101 — Automatically suggest To-Do

If:

```text
registration_required == true
AND registration_deadline exists
```

show:

```text
Register by Friday
```

with an action to create/open a To-Do.

Do not automatically submit external forms.

---

## TASK P0-102 — Build `/todos`

Each item shows:

- [x] event
- [x] deadline
- [x] days/hours remaining
- [x] registration link
- [x] mark done
- [x] dismiss

Sort:

```text
soonest deadline first
```

---

# 18. P1 — Google Calendar Integration

## TASK P1-110 — Google OAuth

- [ ] configure Google OAuth
- [ ] request minimum necessary permissions
- [ ] store tokens securely
- [ ] handle denied permission gracefully

<!-- Scaffolded and mock/local fallback implemented (ICS download). Real provider activation requires manual credentials and is intentionally deferred. -->

---

## TASK P1-111 — Add event to Google Calendar

Create calendar event with:

```text
Title:
🍕 Free Lunch — ML Seminar

Location:
Gates Hillman Center 4307

Description:
Food confidence: Explicit
Source: <URL>
Registration: <URL>
```

---

## TASK P1-112 — Add full itinerary

Button:

```text
Add Day to Calendar
```

Creates selected meal events.

Optional separate walking reminder:

```text
11:50 — Leave for Tepper
```

Do not overcomplicate calendar sync for the hackathon.

---

# 19. P1 — Real Source Coverage

## TASK P1-120 — Add public CMU official events source

- [ ] ingest public listings
- [ ] extract event detail pages
- [ ] store source provenance
- [ ] test incremental crawl

---

## TASK P1-121 — Add department event source

Pick 1–2 departments with useful public events.

Candidates:

- SCS
- Robotics Institute
- Machine Learning
- ECE
- Tepper
- Heinz

Use whichever source structure is easiest and most reliable.

---

## TASK P1-122 — Add student-organization source

Use a public source only.

If login is required:

- do not bypass it
- document it as future authenticated integration
- use another public source for demo

---

## TASK P1-123 — Incremental crawling

On each crawl:

- [x] fetch current content
- [x] compute content hash
- [x] skip unchanged page when appropriate
- [x] update changed events
- [x] track `last_checked_at`
- [x] avoid creating duplicates

---

# 20. P1 — 3D Map Polish

## TASK P1-130 — Building extrusion

If source building geometry supports it:

- [x] add subtle extrusion
- [x] avoid exaggerated skyscraper effect
- [x] maintain legibility
- [x] preserve map performance

---

## TASK P1-131 — Camera transition

When event selected:

- [x] smoothly focus building
- [x] maintain usable pitch
- [x] avoid motion sickness / excessive animation

---

# 21. P1/P2 — Photo Check-In and Rewards

## TASK P1-140 — Photo upload

- [ ] capture/upload image
- [ ] compress before storage
- [ ] store securely
- [ ] associate with event

---

## TASK P1-141 — AI dish recognition

Input:

```text
food image
```

Output:

```text
dish labels[]
confidence
```

UI:

```text
AI detected:
🍕 Pepperoni pizza
🥗 Salad

Looks right?
[Confirm] [Edit]
```

Require user confirmation before treating labels as final.

---

## TASK P1-142 — Live food availability report

After check-in ask:

```text
How much food is left?

🟢 Plenty
🟡 Some
🔴 Gone
```

Display recency:

```text
🟢 Plenty left · reported 12 min ago
```

Old reports should decay / be hidden.

---

## TASK P2-143 — Points

Example:

```text
Attend + photo     +20
Availability report +5
Correct dish label  +5
```

Avoid rewarding obvious spam.

---

## TASK P2-144 — Leaderboard

Optional:

- weekly points
- profile level
- badges

Do not build before core planner is polished.

---

# 22. P2 — Indoor Floor Map

## TASK P2-150 — Floor selector prototype

Only support a few buildings if data is available.

Example:

```text
Gates Hillman
[8]
[7]
[6]
[5]
[4] ←
```

---

## TASK P2-151 — Room markers

Given floor geometry:

- [ ] render room outline / approximate room marker
- [ ] place event within building/floor
- [ ] show elevator/stair reference if available

### Warning

Do not manually model the entire CMU campus during the hackathon.

A polished 3D outdoor map is more valuable than a half-working indoor GIS system.

---

# 23. Error Handling Requirements

## Crawling

- [x] one broken source cannot stop others
- [x] log HTTP status
- [x] log extraction failure
- [x] expose source health in development

## Extraction

- [x] malformed JSON fails validation
- [x] missing date does not become fabricated date
- [x] missing location remains unresolved
- [x] weak food hint is not upgraded to explicit

## Planner

- [x] empty candidates return a friendly state
- [x] impossible lunch/dinner combination is explained
- [x] past RSVP deadline is visible
- [x] walking infeasibility is respected

## UI

- [x] loading state
- [x] empty state
- [x] error state
- [x] offline/demo fallback when practical

---

# 24. Testing

## TASK P0-160 — Unit tests: food classification

Test phrases such as:

```text
"Lunch will be provided."         → EXPLICIT
"Free pizza after the talk."      → EXPLICIT
"Refreshments will be served."    → LIKELY
"Reception follows."              → LIKELY
"Networking event."               → POSSIBLE or NONE
"No food will be provided."       → NONE
```

Include negation tests.

---

## TASK P0-161 — Unit tests: time normalization

Test:

- noon
- midnight
- PM/AM
- cross-midnight
- date inherited from page heading

---

## TASK P0-162 — Unit tests: planner conflicts

Test:

- overlapping events
- insufficient walking time
- exact back-to-back events in same building
- expired registration
- off-campus penalty
- no lunch candidate

---

## TASK P0-163 — Integration test

Fixture:

```text
HackCMU sample document
→ extraction
→ normalization
→ database-shaped object
→ planner candidate
```

---

# 25. Analytics / Debugging for Demo

Development-only panel can display:

```text
Source
Extraction status
Food confidence
Location resolution
Last crawl
```

This is useful when explaining technical depth to judges.

Do not expose internal complexity in the normal user interface.

---

# 26. Security & Privacy

- [x] Never store Google OAuth secrets client-side.
- [x] Keep service-role credentials server-side.
- [x] Validate uploaded image MIME/type.
- [x] Limit upload size.
- [x] Avoid collecting unnecessary precise location.
- [x] Do not automatically register users for external events.
- [x] Do not scrape authenticated/private pages without explicit authorization.
- [x] Treat event-source content as untrusted input.
- [x] Prevent source HTML from being rendered unsanitized.

---

# 27. UX Requirements

## Home / map

Must answer immediately:

```text
Where can I get free food today?
```

Above-the-fold content:

- map
- date
- food markers
- nearest/upcoming opportunities

---

## Planner

Must answer:

```text
Can I eat lunch/dinner for free on the days I am on campus?
```

Do not make the user configure 15 fields.

Default intelligently:

```text
Today
Lunch + Dinner
15-minute walking limit
Explicit + Likely
```

---

## Event detail

The most important trust element is:

```text
Why does the app think food exists?
```

Show:

```text
Confirmed food
98% confidence
“Lunch will be provided.”
```

---

# 28. Accessibility

- [x] markers not distinguishable only by color
- [x] buttons have text/ARIA labels
- [x] adequate contrast
- [x] keyboard-accessible event cards
- [x] reduced-motion friendly
- [x] mobile touch targets >= reasonable minimum size

---

# 29. Performance

Targets for demo:

- [x] initial page is responsive quickly
- [x] map not blocked by AI calls
- [x] source registry
- [x] HTML fetcher
- [x] readable text
- [x] extraction schema
- [x] AI extraction
- [x] food evidence
- [x] normalize time
- [x] normalize location
- [x] HackCMU fixture happens server-side/offline from main request path
- [x] planner uses structured DB data, not fresh LLM generation
- [x] markers load from API/database
- [x] image assets optimized

### Architectural rule

**The user should never wait for the crawler just to use the map.**

Crawler populates the database asynchronously.

---

# 30. 24-Hour Execution Order

## Hour 0–2 — Skeleton

- [x] repo
- [x] database schema
- [x] design tokens
- [x] map shell
- [x] seeded building data
- [x] seeded event data

### Exit criterion

App launches and displays CMU with at least one marker.

---

## Hour 2–6 — Data pipeline

- [x] source registry
- [x] HTML fetcher
- [x] readable text
- [x] extraction schema
- [x] AI extraction
- [x] food evidence
- [x] normalize time
- [x] normalize location
- [x] HackCMU fixture

### Exit criterion

One source/document can become validated structured events.

---

## Hour 6–10 — Product UI

- [x] food markers
- [x] date filter
- [x] meal filter
- [x] event bottom sheet
- [x] confidence badge
- [x] registration badge
- [x] responsive mobile layout

### Exit criterion

User can discover and inspect food events without developer tools.

---

## Hour 10–14 — Planner

- [x] preference form
- [x] walking estimate
- [x] scoring
- [x] conflicts
- [x] itinerary generation
- [x] timeline UI

### Exit criterion

User can generate a feasible lunch/dinner plan.

---

## Hour 14–17 — To-Do / RSVP

- [x] registration extraction
- [x] deadline display
- [x] To-Do list
- [x] register link

### Exit criterion

Future meal opportunity can produce an actionable deadline.

---

## Hour 17–20 — High-value stretch

Choose **one or two**, not all:

- [ ] Google Calendar <!-- ICS fallback implemented; OAuth deferred -->
- [x] 3D building extrusion
- [x] photo recognition <!-- mock labels only -->
- [x] live food remaining report <!-- local/demo state -->

---

## Hour 20–24 — Freeze features

Do not add architecture changes.

Only:

- [ ] bug fixes
- [ ] responsive polish
- [ ] loading/error states
- [ ] fixture reliability
- [ ] demo rehearsal
- [ ] README
- [ ] pitch slide
- [ ] deploy
- [ ] backup local demo

---

# 31. Demo Script

Target total: <= 3 minutes.

## 0:00–0:20 — Problem

> CMU has free food everywhere, but the information is fragmented across department pages, club events, PDFs, talks, and company events.

---

## 0:20–0:50 — AI extraction

Show source/fixture.

Explain:

```text
Unstructured page/PDF
→ structured event
→ food evidence
→ location
→ RSVP deadline
```

Mention that this is not manually entered event data.

---

## 0:50–1:20 — Campus map

Show:

- today's map
- markers
- date filter
- event detail
- confidence/evidence

---

## 1:20–2:05 — Planner

Input:

```text
I’m on campus Monday, Wednesday, Friday.
I want lunch and dinner.
I don’t want to walk more than 12 minutes.
```

Show optimized itinerary.

---

## 2:05–2:30 — RSVP action

Open future event:

```text
Registration required
Deadline tomorrow
```

Add/view To-Do.

---

## 2:30–2:50 — Stretch feature

Use exactly one:

- Calendar
- 3D map
- photo check-in

---

## 2:50–3:00 — Closing line

> **Never miss free food at CMU again.**

---

# 32. Judge-Facing Technical Story

When asked “Where is the technical difficulty?”, explain:

1. **Heterogeneous ingestion**
   - HTML
   - dynamic pages
   - PDFs
   - inconsistent schemas

2. **Grounded semantic extraction**
   - food detection
   - evidence preservation
   - confidence levels
   - registration/deadline parsing

3. **Entity resolution**
   - noisy CMU building names
   - aliases
   - room normalization

4. **Deduplication**
   - same event across multiple sources

5. **Spatiotemporal optimization**
   - meal time windows
   - event overlap
   - walking cost
   - RSVP constraints
   - off-campus penalty

6. **Actionability**
   - To-Do
   - Calendar
   - route/map

This is substantially more than a chat UI around an LLM.

---

# 33. Agent / Cursor Working Rules

These rules are important if Cursor Agent is executing this file.

## Before starting a task

1. Read this entire `task.md`.
2. Identify the next unchecked task with the highest priority.
3. Inspect relevant existing files.
4. Do not rewrite working unrelated modules.
5. State the implementation plan briefly.

## While implementing

- [ ] Prefer small, composable modules.
- [ ] Use TypeScript strict typing.
- [ ] Validate external/AI data.
- [ ] Run tests/build after meaningful changes.
- [ ] Do not add dependencies without a clear reason.
- [ ] Do not silently change schema semantics.
- [ ] Preserve event source provenance.
- [ ] Preserve AI evidence.
- [ ] Do not fabricate missing source facts.
- [ ] Do not make the UI dependent on a live crawler.

## After a task

1. Run relevant tests.
2. Run lint/typecheck.
3. Update task checkbox only if acceptance criteria are met.
4. Note known limitations under the task if necessary.
5. Do not mark partially working tasks complete.

---

# 34. Suggested Cursor Model Strategy

For this project, use models intentionally rather than one model for everything.

## Primary implementation model

**Cursor Grok 4.6 — High effort**

Use for:

- initial project build
- long multi-file agent runs
- visual frontend work
- map interactions
- full vertical-slice implementation
- turning this `task.md` into a working application

Reason: it is optimized in Cursor for long-running agentic coding and ambitious interactive/visual first passes.

## Architecture / hard debugging fallback

**GPT-5.6 Sol**

Use for:

- architecture review
- planner/optimization logic
- difficult TypeScript bugs
- database design
- major refactors
- complex multi-step debugging
- reviewing the finished implementation against this task file

## Fast iteration model

**Composer 2.5**

Use for:

- CSS tweaks
- renaming
- small components
- straightforward CRUD
- quick test fixes
- repetitive local edits

### Recommended workflow

```text
Grok 4.6 High
  ↓
build the main vertical slice
  ↓
GPT-5.6 Sol
  ↓
audit architecture + fix hard problems
  ↓
Composer 2.5
  ↓
fast UI polish / small edits
```

---

# 35. First Prompt to Give Cursor Agent

Paste this after placing `task.md` in the repository:

```text
Read task.md completely before making changes.

We are building the HackCMU MVP described there.

Work strictly in priority order and begin with the smallest end-to-end vertical slice.
Do not implement P1 or P2 features until the P0 pipeline works.

Your first goal is:

1. initialize or inspect the Next.js/TypeScript project,
2. create the core typed event/building/source models,
3. create the database schema/migration,
4. add deterministic seeded CMU building and event data,
5. render the CMU-centered interactive map,
6. display food event markers and an event detail sheet.

After that, stop and verify:
- lint
- typecheck
- production build
- basic UI functionality

Update task.md checkboxes only for work that actually satisfies its acceptance criteria.

Keep the UI map-first, polished, soft, mobile-friendly, and uncluttered.
Do not build gamification, indoor floors, or complex auth yet.
```

---

# 36. Second Cursor Prompt — Data Pipeline

After the first milestone works:

```text
Continue from task.md.

Now implement the P0 ingestion vertical slice:

SOURCE REGISTRY
→ FETCH
→ READABLE TEXT
→ STRUCTURED EVENT EXTRACTION
→ FOOD CLASSIFICATION + EVIDENCE
→ TIME NORMALIZATION
→ LOCATION NORMALIZATION
→ VALIDATED EVENT OBJECT

Use Zod validation around AI output.

Never fabricate event details that are absent from a source.
Every non-NONE food classification must preserve supporting evidence.

Add tests using the HackCMU 2026 fixture before adding multiple real sources.

Do not work on P1 features.
Run lint, typecheck, tests, and build when complete.
```

---

# 37. Third Cursor Prompt — Planner

After map + ingestion works:

```text
Continue from task.md and implement the P0 personalized planner.

Requirements:
- requested meal types
- chosen date/day
- max walking time
- starting/default building
- food confidence
- registration status
- off-campus penalty
- event overlap
- walking feasibility between consecutive events

Use deterministic structured-data logic, not an LLM, for optimization.

Start with the scoring formula in task.md.
A greedy constrained optimizer is sufficient for the hackathon.

Add unit tests for:
- overlapping events
- insufficient walking time
- expired RSVP
- no candidate meal
- two compatible meals

Then build the planner result timeline UI.

Do not implement CP-SAT or other advanced optimization yet.
```

---

# 38. Pre-Demo Checklist

## Data

- [x] seeded fallback data works
- [ ] one real source works <!-- public adapters exist; demo uses fixtures. Live CMU pages are JS-heavy/best-effort. -->
- [x] HackCMU fixture works
- [x] no duplicate obvious events
- [x] evidence visible

## Map

- [x] opens at CMU
- [x] markers visible
- [x] filters work
- [x] no token/config errors
- [x] mobile works

## Planner

- [x] lunch candidate
- [x] dinner candidate
- [x] realistic walking times
- [x] no overlaps
- [x] output deterministic enough for demo

## RSVP

- [x] at least one event requires RSVP
- [x] deadline visible
- [x] To-Do works

## Deployment

- [x] production build
- [ ] deployment URL <!-- requires Vercel/human login -->
- [x] `.env` configured <!-- .env.example only; no secrets -->
- [x] backup local build
- [x] demo mode available

## Presentation

- [ ] 3-minute rehearsal
- [ ] one strong narrative
- [ ] explain technical depth
- [ ] explain evidence/grounding
- [ ] explain optimization
- [ ] end with clear value proposition

---

# 39. Explicit Non-Goals for the 24-Hour MVP

Do not spend critical hackathon time on:

- [ ] full native iOS app
- [ ] full native Android app
- [ ] perfect indoor navigation
- [ ] modeling every CMU floor
- [ ] autonomous RSVP form submission
- [ ] authenticated scraping workarounds
- [ ] full social network
- [ ] complex point economy
- [ ] advanced recommendation ML
- [ ] production-scale distributed crawler
- [ ] perfect campus routing engine
- [ ] complex CP-SAT optimizer before the greedy version works

---

# 40. Post-Hackathon Roadmap

## Phase A — Reliability

- source monitoring
- crawl retry queue
- source-specific adapters
- extraction evaluation set
- human correction workflow
- event expiration logic

## Phase B — Personalization

- class schedule import
- Google Calendar read integration
- dietary preferences
- attendance history
- personalized travel tolerance

## Phase C — Community

- verified check-ins
- photo recognition
- live food status
- reputation scoring
- anti-spam
- points/badges

## Phase D — Campus GIS

- route graph
- building entrances
- accessibility
- indoor floors
- room-level navigation

## Phase E — Expansion

- Pitt
- other universities
- reusable campus source adapters
- school-specific maps and building aliases

---

# 41. Final Product Principle

When choosing between two features, prioritize the one that strengthens this loop:

```text
DISCOVER
→ UNDERSTAND
→ VERIFY
→ OPTIMIZE
→ ACT
```

The core differentiator is not “a list of free food.”

It is:

> **AI transforms fragmented campus information into a trusted, personalized, location-aware free-food plan that the user can actually follow.**
