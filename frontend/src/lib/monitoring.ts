import type * as SentryTypes from '@sentry/react';
import { isAdminHost } from '@/lib/appOrigin';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE;

// @sentry/react is loaded dynamically, not statically imported.
//
// It is ~90 kB gzipped with browserTracing + replay, and a static import from
// main.tsx put all of it in the eager entry chunk — every visitor to the
// marketing page paid for the error reporter before the page painted. Crash
// reporting is worth having but it is never the reason someone opened the site,
// so it loads after first paint instead.
//
// Errors thrown in that window are not lost: captureException queues them and
// flushes once the SDK arrives.
type SentryModule = typeof SentryTypes;

let sentry: SentryModule | null = null;
let loading: Promise<SentryModule | null> | null = null;

/** Events captured before the SDK finished loading. */
const pending: Array<(s: SentryModule) => void> = [];
const MAX_PENDING = 50;

function enqueue(fn: (s: SentryModule) => void): void {
  if (sentry) {
    fn(sentry);
    return;
  }
  // Bounded: an error loop before the SDK loads must not grow without limit.
  if (pending.length < MAX_PENDING) pending.push(fn);
}

/**
 * Strip anything that could carry a credential out of an event before it leaves
 * the browser.
 *
 * The platform admin token bypasses RLS entirely, and it travels in an
 * `X-Platform-Token` header — a header Sentry would otherwise attach verbatim
 * to a failed request's breadcrumb. Query strings can carry auth codes from the
 * OAuth and email-confirmation redirects for the same reason.
 */
const SENSITIVE_KEY = /(token|secret|password|apikey|api_key|authorization|cookie|session)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : scrub(v, depth + 1);
  }
  return out;
}

function stripQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

export function initMonitoring(): void {
  if (!DSN || loading) return;

  // Never on the platform admin host. It holds an RLS-bypassing token in
  // sessionStorage and its screens show every tenant's data; a session replay
  // of that surface is a cross-tenant disclosure waiting to happen, and there
  // is no product reason to instrument an operator-only panel.
  if (isAdminHost()) return;

  const start = () => {
    loading = import('@sentry/react')
      .then(mod => {
        mod.init({
          dsn: DSN,
          environment: ENV,
          // Was true, which told the SDK to attach the visitor's IP address and
          // cookies to every event. The user identity we actually want is set
          // deliberately in setUserContext below and disclosed in the privacy
          // policy; the implicit extras were not.
          sendDefaultPii: false,
          integrations: [
            mod.browserTracingIntegration(),
            mod.replayIntegration({ maskAllText: true, blockAllMedia: true, maskAllInputs: true }),
          ],
          tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 1.0,
          beforeSend(event) {
            if (event.request) {
              event.request.headers = scrub(event.request.headers) as Record<string, string> | undefined;
              event.request.url = stripQuery(event.request.url);
              delete event.request.cookies;
            }
            event.extra = scrub(event.extra) as Record<string, unknown> | undefined;
            return event;
          },
          beforeBreadcrumb(crumb) {
            if (crumb.data && typeof crumb.data === 'object') {
              crumb.data = scrub(crumb.data) as Record<string, unknown>;
              if (typeof crumb.data.url === 'string') crumb.data.url = stripQuery(crumb.data.url);
            }
            return crumb;
          },
        });
        sentry = mod;
        for (const fn of pending.splice(0)) fn(mod);
        return mod;
      })
      .catch(() => {
        // A blocked or failed SDK load must not break the app it is watching.
        pending.length = 0;
        return null;
      });
  };

  // Off the critical path. requestIdleCallback where available, otherwise a
  // timeout — either way after the first paint has had its chance.
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 2000);
  }
}

// Launch-readiness failure categories. Tag captureException calls with one
// of these so Sentry alert rules (configured by a human, out of scope here)
// can filter by category — e.g. "page any payment_failure event".
export type FailureCategory =
  | 'api_error'
  | 'auth_failure'
  | 'db_error'
  | 'sync_failure'
  | 'report_failure'
  | 'payment_failure';

export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
  category?: FailureCategory,
): void {
  if (!DSN) {
    console.error('[monitoring]', category ? `[${category}]` : '', err, context ?? {});
    return;
  }
  enqueue(s =>
    s.captureException(err, { extra: context, tags: category ? { category } : undefined }),
  );
}

export function setUserContext(
  user: { id: string; email?: string | null; role?: string | null; companyId?: string | null } | null,
): void {
  if (!DSN) return;
  enqueue(s =>
    s.setUser(
      user
        ? {
            id: user.id,
            email: user.email ?? undefined,
            role: user.role ?? undefined,
            company: user.companyId ?? undefined,
          }
        : null,
    ),
  );
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!DSN) return;
  enqueue(s => s.addBreadcrumb({ message, data: scrub(data) as Record<string, unknown>, level: 'info' }));
}
