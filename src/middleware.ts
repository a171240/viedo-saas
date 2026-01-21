import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next-intl middleware
 *
 * This middleware handles:
 * - Locale detection from cookie/headers
 * - URL locale prefix management
 * - Redirects to correct locale
 *
 * URL structure:
 * - English (default): /about, /pricing
 * - Other locales: /zh/about, /ko/pricing
 */
export default createMiddleware(routing);

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
