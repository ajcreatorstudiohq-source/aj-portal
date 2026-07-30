/**
 * Agora Live config for AJ Super Portal (TikReels Live).
 * App ID is public; Primary Certificate is server-only (never ship to client).
 */

export const AGORA_APP_ID =
  process.env.NEXT_PUBLIC_AGORA_APP_ID || '7863c5369b3648bf931893a52ebaa6db';

/** Server-only — used by /api/agora/token */
export function getAgoraAppCertificate(): string {
  return (
    process.env.AGORA_APP_CERTIFICATE ||
    process.env.AGORA_PRIMARY_CERTIFICATE ||
    'dc66528c5a5646da8e3ce5d2426759af'
  );
}

export const AGORA_TOKEN_TTL_SEC = 60 * 60; // 1 hour
