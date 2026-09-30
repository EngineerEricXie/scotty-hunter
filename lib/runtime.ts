/** Build-time switches. Keep public environment references literal for Next's bundler. */
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Public assets and fetch URLs need the GitHub Pages subdirectory; Next links do not. */
export function assetPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${BASE_PATH}${path}`;
}
