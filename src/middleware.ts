import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

/**
 * Legacy dashboard redirects
 * Maps old dashboard routes to new routes
 */
const legacyRedirects: Record<string, string> = {
  "/dashboard": "/image-to-video",
  "/dashboard/videos": "/my-creations",
  "/dashboard/billing": "/credits",
  "/dashboard/settings": "/settings",
};

/**
 * Next-intl middleware with legacy dashboard redirects
 *
 * This middleware handles:
 * - Legacy dashboard route redirects
 * - Locale detection from cookie/headers
 * - URL locale prefix management
 * - Redirects to correct locale
 *
 * URL structure:
 * - All locales are prefixed (e.g. /en/about, /zh/pricing)
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale aliases / common typos.
  // Users sometimes type or link to "/zn" when they mean Chinese ("/zh").
  // Also normalize a couple of common Chinese locale variants.
  const localeAliases: Record<string, string> = {
    zn: "zh",
    cn: "zh",
    "zh-CN": "zh",
    "zh-cn": "zh",
  };
  const firstSegment = pathname.split("/")[1] ?? "";
  const aliasedLocale = localeAliases[firstSegment];
  if (aliasedLocale) {
    const rest = pathname.slice(`/${firstSegment}`.length);
    const url = request.nextUrl.clone();
    url.pathname = `/${aliasedLocale}${rest}`;
    return NextResponse.redirect(url);
  }

  // Collapse duplicated locale prefixes (e.g. "/en/en", "/zh/zh").
  // This can happen if a locale-prefixed path is passed into `next-intl` navigation.
  const segments = pathname.split("/");
  const maybeLocale1 = segments[1] ?? "";
  const maybeLocale2 = segments[2] ?? "";
  const locales = routing.locales as readonly string[];
  if (locales.includes(maybeLocale1) && locales.includes(maybeLocale2)) {
    const rest = pathname.slice(`/${maybeLocale1}/${maybeLocale2}`.length);
    const url = request.nextUrl.clone();
    url.pathname = `/${maybeLocale1}${rest}`;
    return NextResponse.redirect(url);
  }

  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (!hasLocalePrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Check for legacy dashboard routes (with locale prefix)
  // e.g., /en/dashboard -> /en/image-to-video
  for (const locale of routing.locales) {
    for (const [from, to] of Object.entries(legacyRedirects)) {
      const localeFrom = `/${locale}${from}`;
      if (pathname === localeFrom || pathname.startsWith(localeFrom + "/")) {
        const rest = pathname.slice(localeFrom.length);
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${to}${rest}`;
        return NextResponse.redirect(url);
      }
    }
  }

  const response = intlMiddleware(request);

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  // Basic CSP to start with (adjust as needed for scripts/styles)
  // response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;")

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes (handled separately by their route handlers)
  // - _next (Next.js internals)
  // - static files (images, fonts, etc.)
  matcher: [
    // Match all pathnames except those starting with api, _next, or having a file extension
    "/((?!api|_next|.*\\..*).*)",
    // Match root pathname
    "/",
  ],
};
