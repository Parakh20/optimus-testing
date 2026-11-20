// Shared secret comparison for the header tokens that guard the platform and
// cron endpoints.
//
// Six functions each carried their own copy of this, and one of them
// (create-tenant) used a plain `!==` instead — which is how a helper that only
// exists by convention drifts. Import it from here.

/**
 * Constant-time-ish equality.
 *
 * A plain `!==` on a secret returns as soon as it hits the first differing
 * byte, so response latency leaks a prefix and the token becomes guessable one
 * character at a time. The length check below is itself a small leak (it
 * reveals the secret's length) but that is not useful against a
 * high-entropy random token, and comparing unequal-length strings byte-wise
 * would be worse.
 *
 * Returns false for empty inputs so an unset environment variable can never
 * authenticate a caller who also sends nothing.
 */
export function tokensMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
