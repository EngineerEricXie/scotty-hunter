export type SourceType =
  | "official_calendar"
  | "department"
  | "student_org"
  | "company_event"
  | "pdf"
  | "manual"
  | "other";

export type ParserType = "html" | "javascript" | "pdf" | "ics" | "rss" | "fixture";

export type FoodStatus = "EXPLICIT" | "LIKELY" | "POSSIBLE" | "NONE";

export type FoodType =
  | "breakfast"
  | "brunch"
  | "lunch"
  | "dinner"
  | "pizza"
  | "snacks"
  | "dessert"
  | "refreshments"
  | "drinks"
  | "catering"
  | "unknown";

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type TodoType = "RSVP" | "REGISTER" | "REMINDER";
export type TodoStatus = "OPEN" | "DONE" | "DISMISSED";

export type AvailabilityStatus = "PLENTY" | "SOME" | "GONE" | "UNKNOWN";

export type CampusZone =
  | "cut"
  | "morewood"
  | "forbes"
  | "frew"
  | "west"
  | "off_campus";

export interface Source {
  id: string;
  name: string;
  base_url: string;
  source_type: SourceType;
  parser_type: ParserType;
  enabled: boolean;
  crawl_interval_minutes: number;
  last_crawled_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_http_status: number | null;
  last_content_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  name: string;
  short_name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  campus_zone: CampusZone;
  off_campus: boolean;
  geojson_feature_id: string;
  height_meters: number;
  footprint_width_m: number;
  footprint_height_m: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  source_id: string;
  source_external_id: string | null;
  title: string;
  description: string;
  organizer: string | null;
  start_time: string;
  end_time: string | null;
  timezone: string;
  source_url: string | null;
  source_type: SourceType;
  venue_raw: string | null;
  building_id: string | null;
  room: string | null;
  floor: string | null;
  location_confidence: number | null;
  food_status: FoodStatus;
  food_types: FoodType[];
  food_confidence: number;
  food_evidence: string | null;
  registration_required: boolean;
  registration_url: string | null;
  registration_deadline: string | null;
  eligibility: string | null;
  capacity_notes: string | null;
  raw_content_hash: string | null;
  extraction_version: string;
  provenance_note: string;
  fingerprint: string;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preferred_days: string[];
  wants_breakfast: boolean;
  wants_lunch: boolean;
  wants_dinner: boolean;
  wants_snacks: boolean;
  max_walking_minutes: number;
  home_building_id: string;
  usual_building_ids: string[];
  dietary_preferences: string[];
  include_likely: boolean;
  explicit_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  event_id: string;
  type: TodoType;
  title: string;
  deadline: string | null;
  status: TodoStatus;
  registration_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  created_at: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  event_id: string;
  meal_type: MealType;
  event_score: number;
  walking_minutes_from_previous: number;
  sequence_index: number;
  leave_at: string | null;
  note: string | null;
}

export interface CheckIn {
  id: string;
  user_id: string;
  event_id: string;
  photo_url: string | null;
  dish_labels: string[];
  availability_status: AvailabilityStatus;
  points_awarded: number;
  created_at: string;
}

export interface AvailabilityReport {
  event_id: string;
  status: AvailabilityStatus;
  reported_at: string;
  source: "user" | "demo";
}

export interface EventFilter {
  date?: string;
  start?: string;
  end?: string;
  food_status?: FoodStatus[];
  meal?: MealType[];
  building?: string;
  include_none?: boolean;
}

export interface PlannerRequest {
  date: string;
  meals: MealType[];
  max_walking_minutes: number;
  start_building_id: string;
  include_likely: boolean;
  explicit_only: boolean;
  allow_expired_registration: boolean;
}

export interface ItineraryLeg {
  kind: "event" | "walk" | "leave";
  at: string;
  title: string;
  subtitle?: string;
  event?: Event;
  meal_type?: MealType;
  walking_minutes?: number;
  score?: number;
  from_building_id?: string;
  to_building_id?: string;
}

export interface Itinerary {
  date: string;
  items: ItineraryLeg[];
  events: Event[];
  meal_count: number;
  event_count: number;
  total_walking_minutes: number;
  estimated_savings_usd: number | null;
  savings_assumption: string;
  notes: string[];
}

export interface ResolvedLocation {
  venue_raw: string;
  building_id: string | null;
  room: string | null;
  floor: string | null;
  resolution_confidence: number;
}

export interface FoodClassification {
  status: FoodStatus;
  types: FoodType[];
  confidence: number;
  evidence: string | null;
}
