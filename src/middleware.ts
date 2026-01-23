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
 * - English (default): /about, /pricing
 * - Other locales: /zh/about, /ko/pricing
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for legacy dashboard routes (without locale prefix)
  for (const [from, to] of Object.entries(legacyRedirects)) {
    if (pathname === from || pathname.startsWith(from + "/")) {
      // Preserve the rest of the path if any
      const rest = pathname.slice(from.length);
      const url = request.nextUrl.clone();
      url.pathname = to + rest;
      return NextResponse.redirect(url);
    }
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

  return intlMiddleware(request);
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
