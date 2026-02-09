import { i18n } from "@/config/i18n-config";

/**
 * `next-intl` navigation APIs expect hrefs without a locale prefix.
 *
 * In practice, hydration races or accidental usage of already-prefixed paths
 * (e.g. "/en") can lead to duplicated locales like "/en/en".
 *
 * This helper normalizes a pathname by removing any leading locale segments.
 */
export function stripLocalePrefix(pathname: string): string {
  if (!pathname) return "/";

  // Ensure leading slash for consistent splitting.
  let normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  // Drop repeated locale segments: "/en/en/foo" -> "/foo".
  // This intentionally only looks at path segments (no query/hash here).
  const locales = i18n.locales as readonly string[];
  // Avoid an infinite loop by capping at a small number.
  for (let i = 0; i < 3; i += 1) {
    const firstSegment = normalized.split("/")[1] ?? "";
    if (!locales.includes(firstSegment)) break;
    normalized = normalized.slice(`/${firstSegment}`.length) || "/";
    if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  }

  return normalized;
}

