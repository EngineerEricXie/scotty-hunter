export const APP_TIMEZONE = "America/New_York" as const;

export const DEMO_DATE_DEFAULT = "2026-09-12";

function readPublic(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

/**
 * Demo mode is ON by default so the HackCMU judging flow never depends on
 * live credentials or campus websites. Set NEXT_PUBLIC_DEMO_MODE=false to
 * prefer live adapters when they are configured.
 */
export const APP_CONFIG = {
  demoMode: readPublic("NEXT_PUBLIC_DEMO_MODE", "true") !== "false",
  demoDate: readPublic("NEXT_PUBLIC_DEMO_DATE", DEMO_DATE_DEFAULT),
  mapStyleUrl: readPublic(
    "NEXT_PUBLIC_MAP_STYLE_URL",
    "https://tiles.openfreemap.org/styles/liberty",
  ),
  appName: "ScottyBites",
  timezone: APP_TIMEZONE,
  walkingMetersPerMinute: 80,
  maxUploadBytes: 4 * 1024 * 1024,
} as const;

export const SERVER_CONFIG = {
  extractionProvider: process.env.EXTRACTION_PROVIDER ?? "heuristic",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  googleCalendarClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
  googleCalendarClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
  googleCalendarRedirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? "",
  mapboxToken: process.env.MAPBOX_TOKEN ?? "",
  maptilerApiKey: process.env.MAPTILER_API_KEY ?? "",
} as const;

export function hasLlmCredentials(): boolean {
  return Boolean(
    SERVER_CONFIG.openaiApiKey ||
      SERVER_CONFIG.anthropicApiKey ||
      SERVER_CONFIG.geminiApiKey,
  );
}

export function hasSupabaseCredentials(): boolean {
  return Boolean(SERVER_CONFIG.supabaseUrl && SERVER_CONFIG.supabaseAnonKey);
}

export function hasGoogleCalendarCredentials(): boolean {
  return Boolean(
    SERVER_CONFIG.googleCalendarClientId &&
      SERVER_CONFIG.googleCalendarClientSecret,
  );
}

export const CMU_MAP_CENTER = {
  longitude: -79.9436,
  latitude: 40.4429,
  zoom: 16.15,
  pitch: 48,
  bearing: -18,
} as const;
