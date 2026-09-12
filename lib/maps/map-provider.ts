/**
 * Map provider abstraction. The user-facing map depends on this boundary,
 * not Mapbox. The current adapter is MapLibre GL + OpenFreeMap/OSM-compatible
 * tiles and does not require a private token.
 */
export const MAP_PROVIDER = "maplibre" as const;
