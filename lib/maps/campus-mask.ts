/**
 * Main Oakland campus outline, clockwise. Follows Morewood, Forbes,
 * Beeler/Gesling, Frew, and Schenley so the colored map is CMU, not Oakland.
 */
export const CMU_CAMPUS_RING: [number, number][] = [
  [-79.9477, 40.44525],
  [-79.9441, 40.44455],
  [-79.94115, 40.44355],
  [-79.93955, 40.44235],
  [-79.93795, 40.44145],
  [-79.93775, 40.44055],
  [-79.9394, 40.43985],
  [-79.94115, 40.43965],
  [-79.94355, 40.43995],
  [-79.94585, 40.44045],
  [-79.94755, 40.44135],
  [-79.94815, 40.44315],
  [-79.9477, 40.44525],
];

/** Ray-cast the campus outline so Scotty stays on mapped CMU roads. */
export function pointInCampus(longitude: number, latitude: number): boolean {
  let inside = false;
  for (let i = 0, j = CMU_CAMPUS_RING.length - 1; i < CMU_CAMPUS_RING.length; j = i++) {
    const current = CMU_CAMPUS_RING[i];
    const previous = CMU_CAMPUS_RING[j];
    if (!current || !previous) continue;
    const [xi, yi] = current;
    const [xj, yj] = previous;
    const crosses = yi > latitude !== yj > latitude;
    if (!crosses) continue;
    const at = ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (longitude < at) inside = !inside;
  }
  return inside;
}
