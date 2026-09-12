import { APP_TIMEZONE } from "@/lib/config";
import { sha256 } from "@/lib/hash";
import { eventFingerprint } from "@/lib/dedup/fingerprint";
import { normalizeLocation } from "@/lib/extraction/normalize-location";
import { zonedWallTimeToIso } from "@/lib/timezone";
import type { Event, FoodStatus, FoodType, SourceType } from "@/lib/types";

const STAMP = "2026-09-10T16:00:00.000Z";

interface Seed {
  id: string;
  source_id: string;
  source_type: SourceType;
  title: string;
  description: string;
  organizer: string | null;
  date: string;
  start: [number, number];
  end?: [number, number];
  venue: string;
  food_status: FoodStatus;
  food_types: FoodType[];
  food_confidence: number;
  food_evidence: string | null;
  registration_required?: boolean;
  registration_url?: string | null;
  registration_deadline?: string | null;
  eligibility?: string | null;
  capacity_notes?: string | null;
  source_url?: string | null;
  provenance_note: string;
}

function ny(date: string, hm: [number, number]): string {
  const [year, month, day] = date.split("-").map(Number);
  return zonedWallTimeToIso(year, month, day, hm[0], hm[1]);
}

function fromSeed(seed: Seed): Event {
  const location = normalizeLocation(seed.venue);
  const start = ny(seed.date, seed.start);
  const end = seed.end ? ny(seed.date, seed.end) : null;
  const fingerprint = eventFingerprint({
    title: seed.title,
    startTime: start,
    organizer: seed.organizer,
    buildingId: location.building_id,
    sourceUrl: seed.source_url ?? null,
  });
  return {
    id: seed.id,
    source_id: seed.source_id,
    source_external_id: seed.id,
    title: seed.title,
    description: seed.description,
    organizer: seed.organizer,
    start_time: start,
    end_time: end,
    timezone: APP_TIMEZONE,
    source_url: seed.source_url ?? null,
    source_type: seed.source_type,
    venue_raw: location.venue_raw,
    building_id: location.building_id,
    room: location.room,
    floor: location.floor,
    location_confidence: location.resolution_confidence,
    food_status: seed.food_status,
    food_types: seed.food_types,
    food_confidence: seed.food_confidence,
    food_evidence: seed.food_evidence,
    registration_required: seed.registration_required ?? false,
    registration_url: seed.registration_url ?? null,
    registration_deadline: seed.registration_deadline ?? null,
    eligibility: seed.eligibility ?? null,
    capacity_notes: seed.capacity_notes ?? null,
    raw_content_hash: sha256(`${seed.id}|${seed.title}|${start}`),
    extraction_version: "seed-v1",
    provenance_note: seed.provenance_note,
    fingerprint,
    last_checked_at: STAMP,
    created_at: STAMP,
    updated_at: STAMP,
  };
}

const DEMO_SEEDS: Seed[] = [
  {
    id: "demo-tartan-breakfast",
    source_id: "scottybites-demo-seed",
    source_type: "manual",
    title: "Tartan Welcome Breakfast",
    description: "Start Saturday with coffee and bagels before hacking resumes.",
    organizer: "Student Affairs",
    date: "2026-09-12",
    start: [8, 30],
    end: [9, 30],
    venue: "CUC Connan",
    food_status: "EXPLICIT",
    food_types: ["breakfast"],
    food_confidence: 0.97,
    food_evidence: "Breakfast will be provided.",
    provenance_note: "Deterministic demo seed. Not live-crawled.",
  },
  {
    id: "demo-ai-seminar-lunch",
    source_id: "scottybites-demo-seed",
    source_type: "department",
    title: "AI Seminar: Grounded Campus Agents",
    description: "SCS seminar with lunch for attendees.",
    organizer: "Machine Learning Department",
    date: "2026-09-12",
    start: [12, 0],
    end: [13, 0],
    venue: "Tepper 1403",
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.98,
    food_evidence: "Lunch will be provided.",
    source_url: "https://www.cs.cmu.edu/calendar/ai-seminar-demo",
    provenance_note: "Deterministic demo seed modeled on typical SCS seminar copy.",
  },
  {
    id: "demo-ri-pizza",
    source_id: "scottybites-demo-seed",
    source_type: "department",
    title: "Robotics Institute pizza talk",
    description: "Open RI talk. Free pizza after the talk.",
    organizer: "Robotics Institute",
    date: "2026-09-12",
    start: [12, 15],
    end: [13, 15],
    venue: "NSH 3305",
    food_status: "EXPLICIT",
    food_types: ["pizza", "lunch"],
    food_confidence: 0.99,
    food_evidence: "Free pizza after the talk.",
    provenance_note: "Deterministic demo seed. Not live-crawled.",
  },
  {
    id: "demo-faculty-council",
    source_id: "scottybites-demo-seed",
    source_type: "official_calendar",
    title: "Faculty Council working session",
    description: "Internal working session. No food will be provided.",
    organizer: "Faculty Senate",
    date: "2026-09-12",
    start: [12, 0],
    end: [13, 0],
    venue: "Hunt Library",
    food_status: "NONE",
    food_types: [],
    food_confidence: 0,
    food_evidence: "No food will be provided.",
    provenance_note: "Negative-control demo seed so the classifier is not a yes-machine.",
  },
  {
    id: "demo-tepper-reception",
    source_id: "scottybites-demo-seed",
    source_type: "department",
    title: "Tepper alumni reception",
    description: "Alumni drop-in. Catered reception follows remarks.",
    organizer: "Tepper School of Business",
    date: "2026-09-12",
    start: [17, 0],
    end: [18, 30],
    venue: "Tepper Simmons Auditorium",
    food_status: "LIKELY",
    food_types: ["catering", "dinner"],
    food_confidence: 0.8,
    food_evidence: "Catered reception follows.",
    provenance_note: "Deterministic demo seed. Not live-crawled.",
  },
  {
    id: "demo-org-mixer",
    source_id: "scottybites-demo-seed",
    source_type: "student_org",
    title: "Student org mixer",
    description: "Open networking social for campus clubs.",
    organizer: "Student Government",
    date: "2026-09-12",
    start: [19, 0],
    end: [21, 0],
    venue: "CUC Rangos",
    food_status: "POSSIBLE",
    food_types: ["unknown"],
    food_confidence: 0.35,
    food_evidence: "Networking social",
    provenance_note: "Weak-hint demo seed. Possible food only.",
  },
  {
    id: "demo-craig-popup",
    source_id: "scottybites-demo-seed",
    source_type: "company_event",
    title: "Craig Street pop-up dinner",
    description: "Off-campus sponsor dinner. Free dinner for hackers who RSVP.",
    organizer: "Neighborhood sponsor",
    date: "2026-09-12",
    start: [18, 30],
    end: [20, 0],
    venue: "Craig Street",
    food_status: "EXPLICIT",
    food_types: ["dinner"],
    food_confidence: 0.95,
    food_evidence: "Free dinner for hackers who RSVP.",
    registration_required: true,
    registration_url: "https://example.org/craig-rsvp",
    provenance_note: "Off-campus demo seed used to exercise the walking penalty.",
  },
  {
    id: "demo-heinz-lunch-rsvp",
    source_id: "scottybites-demo-seed",
    source_type: "department",
    title: "Heinz policy lunch",
    description: "Sunday policy lunch. Registration required. Lunch will be provided.",
    organizer: "Heinz College",
    date: "2026-09-13",
    start: [12, 0],
    end: [13, 15],
    venue: "Hamburg Hall 1000",
    food_status: "EXPLICIT",
    food_types: ["lunch"],
    food_confidence: 0.96,
    food_evidence: "Lunch will be provided.",
    registration_required: true,
    registration_url: "https://www.heinz.cmu.edu/events/policy-lunch-demo",
    registration_deadline: zonedWallTimeToIso(2026, 9, 12, 18, 0),
    eligibility: "CMU students",
    capacity_notes: "Limited seating. First come after registration.",
    provenance_note: "RSVP deadline demo seed. Not live-crawled.",
  },
  {
    id: "demo-sunday-dinner",
    source_id: "scottybites-demo-seed",
    source_type: "student_org",
    title: "Sunday recovery dinner",
    description: "Club dinner after the hackathon. Dinner will be served.",
    organizer: "SCS Student Affairs",
    date: "2026-09-13",
    start: [18, 0],
    end: [19, 30],
    venue: "Gates 4307",
    food_status: "EXPLICIT",
    food_types: ["dinner"],
    food_confidence: 0.94,
    food_evidence: "Dinner will be served.",
    provenance_note: "Tomorrow-filter demo seed.",
  },
  {
    id: "demo-cookie-hour",
    source_id: "scottybites-demo-seed",
    source_type: "department",
    title: "Doherty cookie hour",
    description: "Afternoon snacks for anyone in the building.",
    organizer: "College of Engineering",
    date: "2026-09-12",
    start: [16, 0],
    end: [16, 45],
    venue: "Doherty Hall 2210",
    food_status: "EXPLICIT",
    food_types: ["snacks", "dessert"],
    food_confidence: 0.9,
    food_evidence: "Food provided.",
    provenance_note: "Snack-window demo seed.",
  },
];

export const DEMO_SEEDED_EVENTS: Event[] = DEMO_SEEDS.map(fromSeed);
