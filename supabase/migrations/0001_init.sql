-- ScottyBites / CMU free-food agent
-- Postgres / Supabase schema
-- Apply in a fresh Supabase project; not required for the local demo.

create extension if not exists "pgcrypto";

do $$ begin
  create type source_type as enum (
    'official_calendar',
    'department',
    'student_org',
    'company_event',
    'pdf',
    'manual',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type parser_type as enum ('html', 'javascript', 'pdf', 'ics', 'rss', 'fixture');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type food_status as enum ('EXPLICIT', 'LIKELY', 'POSSIBLE', 'NONE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type todo_type as enum ('RSVP', 'REGISTER', 'REMINDER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type todo_status as enum ('OPEN', 'DONE', 'DISMISSED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type availability_status as enum ('PLENTY', 'SOME', 'GONE', 'UNKNOWN');
exception when duplicate_object then null;
end $$;

create table if not exists sources (
  id text primary key,
  name text not null,
  base_url text not null,
  source_type source_type not null default 'other',
  parser_type parser_type not null default 'html',
  enabled boolean not null default true,
  crawl_interval_minutes integer not null default 180,
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_http_status integer,
  last_content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buildings (
  id text primary key,
  name text not null,
  short_name text not null,
  aliases text[] not null default '{}',
  latitude double precision not null,
  longitude double precision not null,
  campus_zone text,
  off_campus boolean not null default false,
  geojson_feature_id text,
  height_meters integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  source_id text references sources(id) on delete set null,
  source_external_id text,
  title text not null,
  description text not null default '',
  organizer text,
  start_time timestamptz not null,
  end_time timestamptz,
  timezone text not null default 'America/New_York',
  source_url text,
  source_type source_type,
  venue_raw text,
  building_id text references buildings(id) on delete set null,
  room text,
  floor text,
  location_confidence double precision,
  food_status food_status not null default 'NONE',
  food_types text[] not null default '{}',
  food_confidence double precision not null default 0,
  food_evidence text,
  registration_required boolean not null default false,
  registration_url text,
  registration_deadline timestamptz,
  eligibility text,
  capacity_notes text,
  raw_content_hash text,
  extraction_version text,
  provenance_note text,
  fingerprint text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_start_time_idx on events (start_time);
create index if not exists events_food_status_idx on events (food_status);
create index if not exists events_building_id_idx on events (building_id);
create index if not exists events_source_id_idx on events (source_id);
create index if not exists events_registration_deadline_idx on events (registration_deadline);
create index if not exists events_fingerprint_idx on events (fingerprint);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  preferred_days text[] not null default '{}',
  wants_breakfast boolean not null default false,
  wants_lunch boolean not null default true,
  wants_dinner boolean not null default true,
  wants_snacks boolean not null default false,
  max_walking_minutes integer not null default 15,
  home_building_id text references buildings(id),
  usual_building_ids text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  include_likely boolean not null default true,
  explicit_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id text references events(id) on delete cascade,
  type todo_type not null,
  title text not null,
  deadline timestamptz,
  status todo_status not null default 'OPEN',
  registration_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_deadline_idx on todos (deadline);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  plan_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  event_id text references events(id) on delete cascade,
  meal_type text not null,
  event_score double precision,
  walking_minutes_from_previous double precision,
  sequence_index integer not null
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id text references events(id) on delete cascade,
  photo_url text,
  dish_labels text[] not null default '{}',
  availability_status availability_status not null default 'UNKNOWN',
  points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists availability_reports (
  id uuid primary key default gen_random_uuid(),
  event_id text references events(id) on delete cascade,
  status availability_status not null,
  reported_at timestamptz not null default now(),
  source text not null default 'user'
);
