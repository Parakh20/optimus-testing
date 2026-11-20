import { track as vercelTrack } from '@vercel/analytics';

// Vercel Web Analytics is used rather than Google Analytics or PostHog because
// it is cookieless and first-party: the beacon goes to /_vercel/insights on our
// own origin (already covered by `connect-src 'self'` in vercel.json), it sets
// nothing on the visitor's device, and it builds no cross-site profile. That is
// what lets the site work without a consent banner — see /cookies.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Strip identifiers out of a URL before it is reported.
 *
 * The tenant app puts real record ids in the path (/projects/<uuid>, /reports/<uuid>)
 * and plan slugs in the query. Sending those verbatim would turn an aggregate
 * page-view counter into a log of which customer opened which project, which is
 * exactly the kind of processing the privacy policy says we do not do.
 */
export function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(UUID_RE, ':id');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/** Conversion events worth counting. Keep this list short and deliberate. */
export type ConversionEvent =
  | 'demo_request_submitted'
  | 'trial_signup_started'
  | 'trial_signup_completed'
  | 'pricing_compare_opened';

/**
 * Record a conversion. No-ops when the Analytics component is not mounted, so
 * this is safe to call from anywhere including tests.
 */
export function trackConversion(event: ConversionEvent, data?: Record<string, string | number | boolean>): void {
  try {
    vercelTrack(event, data);
  } catch {
    // Analytics must never be able to break a form submission.
  }
}
