// Pure helpers for the Sentry error pipeline:
//   sentry-webhook  verifies and normalises Sentry integration webhooks
//   error-queue     validates what the fixing agent writes back
//
// Everything that arrives here is attacker-reachable text on its way to an
// agent that edits and merges code, so the rules are strict: a delivery that
// does not verify is dropped, text is length-capped, and the agent can only
// write a fixed set of statuses and a PR url inside this repository.

/** Sentry resources that describe an error. Everything else is acknowledged and dropped. */
const ERROR_RESOURCES = new Set(['issue', 'event_alert', 'error']);

const MAX_TEXT = 1000;
const MAX_FRAMES = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PR_URL_RE = /^https:\/\/github\.com\/Parakh20\/gridpoint-testflow\/pull\/\d+$/;

export const AGENT_STATUSES = ['FIXED', 'NEEDS_HUMAN', 'WONT_FIX'] as const;
export type AgentStatus = typeof AGENT_STATUSES[number];

export interface SentryIssue {
  sentryIssueId: string;
  action: string;
  shortId: string | null;
  title: string | null;
  culprit: string | null;
  level: string | null;
  platform: string | null;
  projectSlug: string | null;
  webUrl: string | null;
  environment: string | null;
  release: string | null;
  eventCount: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  stacktrace: unknown[] | null;
}

async function hmacHex(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * `Sentry-Hook-Signature` is a hex HMAC-SHA256 of the body keyed with the
 * integration's client secret. Sentry's documented verifiers sign
 * `JSON.stringify(body)`, so the compact re-serialisation is accepted as well as
 * the raw bytes — both are keyed with the same secret, so neither is weaker.
 */
export async function verifySentrySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const provided = signature.trim().toLowerCase();
  if (timingSafeEqual(await hmacHex(rawBody, secret), provided)) return true;
  try {
    const compact = JSON.stringify(JSON.parse(rawBody));
    if (compact === rawBody) return false;
    return timingSafeEqual(await hmacHex(compact, secret), provided);
  } catch {
    return false;
  }
}

function text(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) : value;
}

function count(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** Keep only the frames of the last exception, newest last, capped. */
function framesOf(event: Record<string, any>): unknown[] | null {
  const values = event?.exception?.values;
  if (!Array.isArray(values) || values.length === 0) return null;
  const frames = values[values.length - 1]?.stacktrace?.frames;
  if (!Array.isArray(frames)) return null;
  return frames.slice(-MAX_FRAMES).map((f: Record<string, unknown>) => ({
    filename: text(f?.filename),
    function: text(f?.function),
    lineno: count(f?.lineno),
    colno: count(f?.colno),
    in_app: f?.in_app === true,
  }));
}

/** Normalise a verified webhook into one issue record, or null when it is not an error. */
export function extractSentryIssue(resource: string | null, payload: Record<string, any>): SentryIssue | null {
  if (!resource || !ERROR_RESOURCES.has(resource)) return null;
  const data = payload?.data ?? {};
  const action = typeof payload?.action === 'string' ? payload.action : 'unknown';

  if (resource === 'issue') {
    const issue = data.issue ?? {};
    const id = text(issue.id);
    if (!id) return null;
    return {
      sentryIssueId: id,
      action,
      shortId: text(issue.shortId),
      title: text(issue.title),
      culprit: text(issue.culprit),
      level: text(issue.level),
      platform: text(issue.platform),
      projectSlug: text(issue.project?.slug),
      webUrl: text(issue.web_url),
      environment: null,
      release: null,
      eventCount: count(issue.count),
      firstSeen: text(issue.firstSeen),
      lastSeen: text(issue.lastSeen),
      stacktrace: null,
    };
  }

  // event_alert and error both carry a full event.
  const event = data.event ?? data.error ?? {};
  const id = text(String(event.issue_id ?? event.groupID ?? ''));
  if (!id) return null;
  return {
    sentryIssueId: id,
    action,
    shortId: null,
    title: text(event.title),
    culprit: text(event.culprit),
    level: text(event.level),
    platform: text(event.platform),
    projectSlug: text(event.project_slug ?? event.project),
    webUrl: text(event.web_url),
    environment: text(event.environment),
    release: text(event.release),
    eventCount: null,
    firstSeen: null,
    lastSeen: text(event.datetime),
    stacktrace: framesOf(event),
  };
}

export type ErrorUpdate = {
  id: string;
  status: AgentStatus;
  fixPrUrl: string | null;
  agentNotes: string | null;
};

/** Validate what the fixing agent reports back. */
export function parseErrorUpdate(body: Record<string, unknown>): { ok: true; value: ErrorUpdate } | { ok: false; error: string } {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!UUID_RE.test(id)) return { ok: false, error: 'id must be a uuid' };
  const status = body.status;
  if (typeof status !== 'string' || !(AGENT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: `status must be one of ${AGENT_STATUSES.join(', ')}` };
  }
  const pr = body.fix_pr_url;
  if (pr != null && (typeof pr !== 'string' || !PR_URL_RE.test(pr))) {
    return { ok: false, error: 'fix_pr_url must be a pull request in this repository' };
  }
  return {
    ok: true,
    value: {
      id,
      status: status as AgentStatus,
      fixPrUrl: (pr as string | undefined) ?? null,
      agentNotes: text(body.agent_notes),
    },
  };
}
