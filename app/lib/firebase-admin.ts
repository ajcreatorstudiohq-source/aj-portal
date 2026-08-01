/**
 * Firebase Admin SDK (server-only) — lazy-loaded so route modules
 * never crash at import time when credentials are missing/invalid.
 *
 * Set either:
 *   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 * or discrete vars:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Optional: FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 of the JSON)
 */
import 'server-only';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export type AdminDiag = {
  ready: boolean;
  configured: boolean;
  source: 'json' | 'base64' | 'discrete' | 'none';
  projectId: string | null;
  clientEmailSet: boolean;
  privateKeySet: boolean;
  lastError: string | null;
};

let adminApp: App | null = null;
let initAttempted = false;
let lastError: string | null = null;
let credSource: AdminDiag['source'] = 'none';

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function stripWrappingQuotes(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function parseServiceAccountJson(raw: string): ServiceAccount | null {
  const cleaned = stripWrappingQuotes(raw);
  let parsed: {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    // Vercel sometimes stores JSON with literal newlines escaped twice
    try {
      parsed = JSON.parse(cleaned.replace(/\n/g, '\\n')) as typeof parsed;
    } catch (e2) {
      lastError =
        e2 instanceof Error
          ? `JSON parse failed: ${e2.message}`
          : 'JSON parse failed';
      console.error('[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON', e2);
      return null;
    }
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    lastError = 'Service account JSON missing project_id/client_email/private_key';
    return null;
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
  };
}

function loadServiceAccount(): ServiceAccount | null {
  lastError = null;

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim()) {
    const sa = parseServiceAccountJson(rawJson);
    if (sa) {
      credSource = 'json';
      return sa;
    }
  }

  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (rawB64 && rawB64.trim()) {
    try {
      const decoded = Buffer.from(stripWrappingQuotes(rawB64), 'base64').toString(
        'utf8'
      );
      const sa = parseServiceAccountJson(decoded);
      if (sa) {
        credSource = 'base64';
        return sa;
      }
    } catch (e) {
      lastError =
        e instanceof Error
          ? `BASE64 decode failed: ${e.message}`
          : 'BASE64 decode failed';
      console.error('[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT_BASE64', e);
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    credSource = 'discrete';
    return { projectId, clientEmail, privateKey };
  }

  credSource = 'none';
  if (!lastError) {
    lastError =
      'No service account configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.';
  }
  return null;
}

type AdminSdkCore = {
  cert: typeof import('firebase-admin/app').cert;
  getApps: typeof import('firebase-admin/app').getApps;
  initializeApp: typeof import('firebase-admin/app').initializeApp;
  getFirestore: typeof import('firebase-admin/firestore').getFirestore;
  FieldValue: typeof import('firebase-admin/firestore').FieldValue;
};

let cachedSdk: AdminSdkCore | null = null;

function loadAdminSdk(): AdminSdkCore | null {
  if (cachedSdk) return cachedSdk;
  try {
    // Load ONLY app + firestore. Do NOT load firebase-admin/auth here —
    // auth pulls jwks-rsa → jose ESM which breaks require() on Vercel.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appMod = require('firebase-admin/app') as typeof import('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsMod =
      require('firebase-admin/firestore') as typeof import('firebase-admin/firestore');
    cachedSdk = {
      cert: appMod.cert,
      getApps: appMod.getApps,
      initializeApp: appMod.initializeApp,
      getFirestore: fsMod.getFirestore,
      FieldValue: fsMod.FieldValue,
    };
    return cachedSdk;
  } catch (e) {
    lastError =
      e instanceof Error
        ? `firebase-admin load failed: ${e.message}`
        : 'firebase-admin load failed';
    console.error('[firebase-admin] package load failed', e);
    return null;
  }
}

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (initAttempted && !adminApp) return null;
  initAttempted = true;

  try {
    const sdk = loadAdminSdk();
    if (!sdk) return null;

    if (sdk.getApps().length) {
      adminApp = sdk.getApps()[0]!;
      return adminApp;
    }

    const sa = loadServiceAccount();
    if (!sa) {
      console.warn(`[firebase-admin] ${lastError}`);
      return null;
    }

    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${sa.projectId}.appspot.com`;

    adminApp = sdk.initializeApp({
      credential: sdk.cert({
        projectId: sa.projectId,
        clientEmail: sa.clientEmail,
        privateKey: sa.privateKey,
      }),
      projectId: sa.projectId,
      storageBucket,
    });
    lastError = null;
    return adminApp;
  } catch (e) {
    lastError =
      e instanceof Error
        ? `initializeApp failed: ${e.message}`
        : 'initializeApp failed';
    console.error('[firebase-admin] init failed', e);
    adminApp = null;
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  try {
    const app = getAdminApp();
    if (!app) return null;
    const sdk = loadAdminSdk();
    if (!sdk) return null;
    return sdk.getFirestore(app);
  } catch (e) {
    lastError =
      e instanceof Error ? `getFirestore failed: ${e.message}` : 'getFirestore failed';
    console.error('[firebase-admin] getAdminDb failed', e);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    const app = getAdminApp();
    if (!app) return null;
    // Auth is optional — load only when needed (may fail on jose ESM; claim path does not need it)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAuth } = require('firebase-admin/auth') as typeof import('firebase-admin/auth');
    return getAuth(app);
  } catch (e) {
    lastError =
      e instanceof Error ? `getAuth failed: ${e.message}` : 'getAuth failed';
    console.error('[firebase-admin] getAdminAuth failed', e);
    return null;
  }
}

export function isFirebaseAdminReady() {
  return !!getAdminApp();
}

/** Lazy FieldValue — keeps API routes import-safe. */
export const FieldValue = {
  serverTimestamp: () => {
    const sdk = loadAdminSdk();
    if (!sdk) throw new Error(lastError || 'firebase-admin unavailable');
    return sdk.FieldValue.serverTimestamp();
  },
  increment: (n: number) => {
    const sdk = loadAdminSdk();
    if (!sdk) throw new Error(lastError || 'firebase-admin unavailable');
    return sdk.FieldValue.increment(n);
  },
  arrayUnion: (...args: unknown[]) => {
    const sdk = loadAdminSdk();
    if (!sdk) throw new Error(lastError || 'firebase-admin unavailable');
    return sdk.FieldValue.arrayUnion(...args);
  },
  arrayRemove: (...args: unknown[]) => {
    const sdk = loadAdminSdk();
    if (!sdk) throw new Error(lastError || 'firebase-admin unavailable');
    return sdk.FieldValue.arrayRemove(...args);
  },
  delete: () => {
    const sdk = loadAdminSdk();
    if (!sdk) throw new Error(lastError || 'firebase-admin unavailable');
    return sdk.FieldValue.delete();
  },
};

export function getFirebaseAdminDiag(): AdminDiag {
  const rawJson = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const rawB64 = !!(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();
  const discrete =
    !!(process.env.FIREBASE_CLIENT_EMAIL || '').trim() &&
    (process.env.FIREBASE_PRIVATE_KEY || '').includes('BEGIN PRIVATE KEY');
  const configured = rawJson || rawB64 || discrete;
  let ready = false;
  try {
    ready = !!getAdminDb();
  } catch {
    ready = false;
  }
  return {
    ready,
    configured,
    source: credSource,
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      null,
    clientEmailSet: !!(process.env.FIREBASE_CLIENT_EMAIL || '').trim() || rawJson || rawB64,
    privateKeySet:
      (process.env.FIREBASE_PRIVATE_KEY || '').includes('BEGIN PRIVATE KEY') ||
      rawJson ||
      rawB64,
    lastError,
  };
}
