// Edge Function rate limiter — Postgres-backed sliding window.
// Use to protect public-ish or admin Edge Functions from abuse.
//
//   import { enforceRateLimit } from '../_shared/rate_limit.ts';
//   const rl = await enforceRateLimit(supabaseAdmin, req, {
//     key: `create-user:${callerUserId}`, limit: 20, windowMinutes: 60,
//   });
//   if (!rl.ok) return rl.response;
//
// The supabaseAdmin client must be the service-role client (rate_limit_check
// is SECURITY DEFINER but the RPC GRANT defaults to public — we pass through
// to be explicit).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMinutes: number;
  /**
   * Whether the caller's IP is folded into the bucket key. Default true.
   *
   * Set false for a deliberate global circuit breaker — a per-IP bucket bounds
   * one caller but does nothing against a distributed flood, which matters on
   * the endpoints that create resources without credentials.
   */
  perIp?: boolean;
}

interface RateLimitResult {
  ok: true;
}

interface RateLimitBlocked {
  ok: false;
  response: Response;
}

/**
 * Best-available client IP for bucketing.
 *
 * The previous implementation took `x-forwarded-for.split(',')[0]` and its
 * comment claimed to "trust X-Forwarded-For from Supabase ingress" — but the
 * LEFTMOST entry in that chain is whatever the client sent. A proxy appends its
 * observed peer address to the right; it does not replace what came in. So the
 * caller chose their own bucket key, and could rotate it per request: for
 * start-trial, the one endpoint that creates companies with no credentials,
 * this rate limit is the only abuse control there is.
 *
 * Prefer headers a client cannot forge because the edge overwrites them, and
 * fall back to the RIGHTMOST forwarded hop — the one appended by the nearest
 * trusted proxy — rather than the leftmost.
 */
export function clientIp(req: Request): string {
  const direct = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip');
  if (direct) return direct.trim();

  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - 1] ?? 'unknown';
}

export async function enforceRateLimit(
  supabaseAdmin: SupabaseClient,
  req: Request,
  opts: RateLimitOptions,
  corsHeaders: Record<string, string>,
): Promise<RateLimitResult | RateLimitBlocked> {
  const fullKey = opts.perIp === false ? opts.key : `${opts.key}|ip:${clientIp(req)}`;

  const { data, error } = await supabaseAdmin.rpc('rate_limit_check', {
    _key: fullKey,
    _limit: opts.limit,
    _window_minutes: opts.windowMinutes,
  });

  if (error) {
    // Fail open on rate-limit infrastructure errors — better than blocking
    // legitimate traffic when the rate-limit table is the problem.
    console.error('rate_limit_check error (failing open):', error.message);
    return { ok: true };
  }

  if (data === false) {
    const response = new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after_seconds: opts.windowMinutes * 60,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(opts.windowMinutes * 60),
        },
      },
    );
    return { ok: false, response };
  }

  return { ok: true };
}
