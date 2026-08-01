/**
 * Client helper — ensure current browser host is in Firebase Auth authorized domains
 * (needed for Google OAuth on Netlify deploy previews).
 */
export async function ensureCurrentAuthDomain(): Promise<{
  ok: boolean;
  host?: string;
  added?: string[];
  message?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'not_browser' };
  }
  const host = window.location.hostname;
  // localhost is usually already authorized
  if (host === 'localhost' || host === '127.0.0.1') {
    return { ok: true, host, message: 'localhost' };
  }
  try {
    const res = await fetch('/api/auth/authorized-domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      host?: string;
      added?: string[];
      message?: string;
      error?: string;
    };
    return {
      ok: !!data.ok,
      host: data.host || host,
      added: data.added,
      message: data.message,
      error: data.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      host,
      error: e instanceof Error ? e.message : 'ensure_domain_failed',
    };
  }
}
