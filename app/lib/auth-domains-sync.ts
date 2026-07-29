/**
 * Sync Firebase Auth authorizedDomains via Identity Toolkit Admin API.
 */
import 'server-only';
import { getAdminApp, getFirebaseAdminDiag } from './firebase-admin';
import {
  mergeAuthorizedDomains,
  normalizeAuthHost,
  isAllowedPreviewAuthHost,
  BASE_AUTH_DOMAINS,
} from './auth-domains';

async function getAccessToken(): Promise<string | null> {
  const app = getAdminApp();
  if (!app?.options?.credential) return null;
  const cred = app.options.credential as {
    getAccessToken: () => Promise<{ accessToken?: string }>;
  };
  const tok = await cred.getAccessToken();
  return tok?.accessToken || null;
}

function projectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    getFirebaseAdminDiag().projectId ||
    'aj-super-portal'
  );
}

export type AuthDomainsSyncResult = {
  ok: boolean;
  projectId: string;
  authorizedDomains?: string[];
  added?: string[];
  error?: string;
  message?: string;
};

export async function fetchAuthorizedDomains(): Promise<AuthDomainsSyncResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      ok: false,
      projectId: projectId(),
      error: 'admin_sdk_missing',
      message:
        'FIREBASE_SERVICE_ACCOUNT_JSON required to read/update authorized domains.',
    };
  }
  const pid = projectId();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${pid}/config`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  const data = (await res.json().catch(() => ({}))) as {
    authorizedDomains?: string[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      ok: false,
      projectId: pid,
      error: 'identity_toolkit_error',
      message: data.error?.message || `HTTP ${res.status}`,
    };
  }
  return {
    ok: true,
    projectId: pid,
    authorizedDomains: data.authorizedDomains || [],
  };
}

export async function ensureAuthorizedDomains(
  hosts: string[]
): Promise<AuthDomainsSyncResult> {
  const allowed = hosts
    .map(normalizeAuthHost)
    .filter((h) => isAllowedPreviewAuthHost(h));
  if (allowed.length === 0 && hosts.length > 0) {
    return {
      ok: false,
      projectId: projectId(),
      error: 'host_not_allowed',
      message:
        'Host is not an allowed Netlify/Vercel preview for this project.',
    };
  }

  const current = await fetchAuthorizedDomains();
  if (!current.ok) return current;

  const { next, added } = mergeAuthorizedDomains(
    current.authorizedDomains || [],
    [...allowed, ...BASE_AUTH_DOMAINS]
  );

  if (added.length === 0) {
    return {
      ok: true,
      projectId: current.projectId,
      authorizedDomains: next,
      added: [],
      message: 'Domain already authorized.',
    };
  }

  const token = await getAccessToken();
  if (!token) {
    return {
      ok: false,
      projectId: projectId(),
      error: 'admin_sdk_missing',
    };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${current.projectId}/config?updateMask=authorizedDomains`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorizedDomains: next }),
      cache: 'no-store',
    }
  );
  const data = (await res.json().catch(() => ({}))) as {
    authorizedDomains?: string[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      ok: false,
      projectId: current.projectId,
      error: 'identity_toolkit_patch_failed',
      message: data.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    projectId: current.projectId,
    authorizedDomains: data.authorizedDomains || next,
    added,
    message: `Authorized: ${added.join(', ')}`,
  };
}
