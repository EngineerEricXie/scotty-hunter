-- Personalization fields for events and user preferences.
-- Local demo uses fixtures; this migration is for a future Supabase project.

alter table if exists events
  add column if not exists location_status text not null default 'UNKNOWN',
  add column if not exists food_items text[] not null default '{}',
  add column if not exists cuisine_tags text[] not null default '{}',
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists registration_status text not null default 'NOT_REQUIRED',
  add column if not exists event_types text[] not null default '{}';

alter table if exists user_preferences
  add column if not exists campus_days text[] not null default '{monday,wednesday,friday}',
  add column if not exists ideal_walking_minutes integer not null default 10,
  add column if not exists dietary_constraints text[] not null default '{}',
  add column if not exists favorite_foods text[] not null default '{}',
  add column if not exists disliked_foods text[] not null default '{}',
  add column if not exists preferred_cuisines text[] not null default '{}',
  add column if not exists allow_possible_food boolean not null default false,
  add column if not exists willing_to_rsvp text not null default 'only_if_worth_it',
  add column if not exists preferred_event_types text[] not null default '{}',
  add column if not exists disliked_event_types text[] not null default '{}',
  add column if not exists preferred_campus_zones text[] not null default '{}',
  add column if not exists seen_onboarding boolean not null default false;

do $$ begin
  alter type todo_status add value if not exists 'OVERDUE';
exception when duplicate_object then null;
end $$;
