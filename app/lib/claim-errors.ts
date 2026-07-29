/**
 * Map raw Firebase / API errors to safe user-facing claim messages.
 * Never surface "Missing or insufficient permissions" as a crash toast.
 */

export function isPermissionDeniedMessage(raw: unknown): boolean {
  const s = String(raw || '').toLowerCase();
  return (
    s.includes('insufficient permissions') ||
    s.includes('permission_denied') ||
    s.includes('permission-denied') ||
    s.includes('missing or insufficient')
  );
}

export function publicClaimErrorMessage(
  input?: {
    error?: string;
    message?: string;
    status?: number;
  } | null,
  fallback = 'Claim failed. Please try again.'
): string {
  const error = String(input?.error || '');
  const message = String(input?.message || '');
  const combined = `${error} ${message}`;

  if (error === 'admin_sdk_missing' || message.includes('FIREBASE_SERVICE_ACCOUNT')) {
    return (
      message ||
      'Server wallet is not configured. Admin must set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.'
    );
  }
  if (error === 'unauthorized' || error === 'invalid_token' || input?.status === 401) {
    return 'Please sign in again, then retry the claim.';
  }
  if (error === 'account_banned') {
    return message || 'Account restricted.';
  }
  if (error === 'daily_limit') {
    return message || 'Daily claim limit reached. Try again tomorrow.';
  }
  if (
    error === 'wrong_answer' ||
    error === 'wrong_code' ||
    error === 'session_expired' ||
    error === 'invalid_session' ||
    error === 'missing_session' ||
    error === 'verify_too_fast'
  ) {
    return message || fallback;
  }
  if (isPermissionDeniedMessage(combined) || error === 'permission_denied') {
    return (
      'Server cannot write wallet coins right now (permission). ' +
      'This is not your account login — ask admin to check Firebase Admin IAM / FIREBASE_SERVICE_ACCOUNT_JSON, ' +
      'and publish the latest firestore.rules.'
    );
  }
  if (message && !isPermissionDeniedMessage(message)) return message;
  if (error && !isPermissionDeniedMessage(error) && !error.startsWith('http_')) {
    return error;
  }
  return fallback;
}

/** Normalize thrown/API errors for JSON responses from claim routes. */
export function normalizeServerClaimFailure(e: unknown): {
  error: string;
  message: string;
  status: number;
} {
  const raw = e instanceof Error ? e.message : String(e || 'claim_failed');
  if (isPermissionDeniedMessage(raw)) {
    return {
      error: 'permission_denied',
      message: publicClaimErrorMessage({ error: 'permission_denied', message: raw }),
      status: 503,
    };
  }
  if (raw === 'admin_sdk_missing' || raw.includes('firebase-admin')) {
    return {
      error: 'admin_sdk_missing',
      message:
        'Server cannot credit coins. Configure FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.',
      status: 503,
    };
  }
  if (raw === 'daily_limit') {
    return {
      error: 'daily_limit',
      message: 'Daily claim limit reached.',
      status: 429,
    };
  }
  if (
    raw === 'invalid_session' ||
    raw === 'session_mismatch' ||
    raw === 'session_expired' ||
    raw === 'wrong_answer' ||
    raw === 'wrong_code'
  ) {
    return { error: raw, message: raw.replace(/_/g, ' '), status: 400 };
  }
  return {
    error: 'credit_failed',
    message: 'Claim failed on server. Please start a new session and try again.',
    status: 500,
  };
}
