// Unit tests for the Sentry webhook verifier and payload normaliser used by
// sentry-webhook, and the update validator used by error-queue.
//
// The verifier is the only thing between a public endpoint and an attacker
// writing text that an auto-merging agent will read as an error to fix, so the
// negative cases matter as much as the positive one.
//
// Pure — no network, no `supabase start`. Run:
//   cd supabase/functions && deno test --allow-env _shared/sentry_webhook.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  extractSentryIssue,
  parseErrorUpdate,
  verifySentrySignature,
} from './sentry_webhook.ts';

const SECRET = 'test-client-secret';

async function hexHmac(body: string, secret = SECRET): Promise<string> {
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

Deno.test('verify: accepts a signature over the raw body', async () => {
  const body = '{"action":"created","data":{}}';
  assertEquals(await verifySentrySignature(body, await hexHmac(body), SECRET), true);
});

Deno.test('verify: accepts a signature over the re-serialised body', async () => {
  // Sentry's own examples sign JSON.stringify(parsed body); a body with
  // whitespace must still verify when the sender signed the compact form.
  const body = '{ "action": "created", "data": {} }';
  const compact = JSON.stringify(JSON.parse(body));
  assertEquals(await verifySentrySignature(body, await hexHmac(compact), SECRET), true);
});

Deno.test('verify: rejects a tampered body', async () => {
  const sig = await hexHmac('{"action":"created"}');
  assertEquals(await verifySentrySignature('{"action":"resolved"}', sig, SECRET), false);
});

Deno.test('verify: rejects the wrong secret', async () => {
  const body = '{"action":"created"}';
  assertEquals(await verifySentrySignature(body, await hexHmac(body, 'other'), SECRET), false);
});

Deno.test('verify: rejects a missing header or unset secret', async () => {
  const body = '{"action":"created"}';
  const sig = await hexHmac(body);
  assertEquals(await verifySentrySignature(body, null, SECRET), false);
  assertEquals(await verifySentrySignature(body, '', SECRET), false);
  assertEquals(await verifySentrySignature(body, sig, ''), false);
});

const issuePayload = {
  action: 'created',
  data: {
    issue: {
      id: '1234567890',
      shortId: 'TESTFLOW-1',
      title: "TypeError: Cannot read properties of undefined (reading 'id')",
      culprit: 'ProjectDetail',
      level: 'error',
      platform: 'javascript',
      project: { slug: 'testflow-web' },
      web_url: 'https://org.sentry.io/issues/1234567890/',
      count: '3',
      firstSeen: '2026-09-13T10:00:00+00:00',
      lastSeen: '2026-09-13T10:05:00+00:00',
    },
  },
};

Deno.test('extract: normalises an issue webhook', () => {
  const issue = extractSentryIssue('issue', issuePayload);
  assertEquals(issue?.sentryIssueId, '1234567890');
  assertEquals(issue?.shortId, 'TESTFLOW-1');
  assertEquals(issue?.projectSlug, 'testflow-web');
  assertEquals(issue?.eventCount, 3);
  assertEquals(issue?.action, 'created');
  assertEquals(issue?.stacktrace, null);
});

Deno.test('extract: pulls the stack trace out of an event_alert', () => {
  const frames = [{ filename: 'src/pages/projects/ProjectDetail.tsx', function: 'load', lineno: 42 }];
  const payload = {
    action: 'triggered',
    data: {
      event: {
        issue_id: '1234567890',
        title: 'TypeError: x is undefined',
        culprit: 'ProjectDetail',
        level: 'error',
        platform: 'javascript',
        web_url: 'https://org.sentry.io/issues/1234567890/events/abc/',
        environment: 'production',
        release: 'abc123',
        exception: { values: [{ type: 'TypeError', value: 'x is undefined', stacktrace: { frames } }] },
      },
      triggered_rule: 'Any new error',
    },
  };
  const issue = extractSentryIssue('event_alert', payload);
  assertEquals(issue?.sentryIssueId, '1234567890');
  assertEquals(issue?.environment, 'production');
  assertEquals(issue?.release, 'abc123');
  assertEquals(Array.isArray(issue?.stacktrace), true);
});

Deno.test('extract: ignores resources that are not errors', () => {
  assertEquals(extractSentryIssue('installation', { action: 'created', data: {} }), null);
  assertEquals(extractSentryIssue('comment', { action: 'created', data: {} }), null);
});

Deno.test('extract: returns null when the issue id is missing', () => {
  assertEquals(extractSentryIssue('issue', { action: 'created', data: { issue: { title: 'x' } } }), null);
});

Deno.test('extract: truncates oversized text fields', () => {
  const long = 'a'.repeat(5000);
  const issue = extractSentryIssue('issue', {
    action: 'created',
    data: { issue: { ...issuePayload.data.issue, title: long } },
  });
  assertEquals((issue?.title ?? '').length <= 1000, true);
});

Deno.test('parseErrorUpdate: accepts a terminal status with a PR url', () => {
  const r = parseErrorUpdate({
    id: '7b0d8f3e-2c1a-4a57-9d2b-1f3e5c7a9b11',
    status: 'FIXED',
    fix_pr_url: 'https://github.com/Parakh20/gridpoint-testflow/pull/9',
    agent_notes: 'null guard',
  });
  assertEquals(r.ok, true);
});

Deno.test('parseErrorUpdate: rejects an unknown status', () => {
  const r = parseErrorUpdate({ id: '7b0d8f3e-2c1a-4a57-9d2b-1f3e5c7a9b11', status: 'NEW' });
  assertEquals(r.ok, false);
});

Deno.test('parseErrorUpdate: rejects a non-uuid id', () => {
  assertEquals(parseErrorUpdate({ id: "1' OR 1=1", status: 'FIXED' }).ok, false);
});

Deno.test('parseErrorUpdate: rejects a PR url outside the repository', () => {
  const r = parseErrorUpdate({
    id: '7b0d8f3e-2c1a-4a57-9d2b-1f3e5c7a9b11',
    status: 'FIXED',
    fix_pr_url: 'https://evil.example/pull/1',
  });
  assertEquals(r.ok, false);
});
