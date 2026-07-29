/**
 * Client helpers for ad impression/click tracking and offerwall rewarded video.
 */
import type { AdEventType, AdPlacement } from './ads-config';

export type AdTrackResult = {
  ok: boolean;
  error?: string;
  eventId?: string;
};

export type RewardedVideoResult = {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  creditedCoins?: number;
  userUsd?: number;
  adminUsd?: number;
  totalPoolUsd?: number;
  message?: string;
  sessionId?: string;
  remainingToday?: number;
  createdAtMs?: number;
  expiresAt?: number;
  persistClient?: boolean;
  sessionPayload?: {
    createdAtMs?: number;
    expiresAt?: number;
    verifySeconds?: number;
    slot?: number;
  };
};

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ms = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function authHeaders(user?: { getIdToken: () => Promise<string> } | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) {
    try {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    } catch {
      /* optional auth for impressions */
    }
  }
  return headers;
}

export async function trackAdEvent(
  opts: {
    event: AdEventType;
    placement: AdPlacement | string;
    zoneId?: number;
    meta?: Record<string, unknown>;
  },
  user?: { getIdToken: () => Promise<string> } | null
): Promise<AdTrackResult> {
  try {
    const headers = await authHeaders(user);
    const res = await fetchWithTimeout('/api/ads/track', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: opts.event,
        placement: opts.placement,
        zoneId: opts.zoneId,
        meta: opts.meta || {},
      }),
    });
    const data = (await res.json().catch(() => ({}))) as AdTrackResult;
    if (!res.ok) return { ok: false, error: data.error || `http_${res.status}` };
    return data;
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'track_failed' };
  }
}

export async function prepareRewardedVideo(
  user: { getIdToken: () => Promise<string> } | null | undefined,
  placement: AdPlacement | string = 'offerwall_rewarded_video'
): Promise<RewardedVideoResult> {
  if (!user) return { ok: false, error: 'not_signed_in' };
  try {
    const token = await user.getIdToken();
    const res = await fetchWithTimeout('/api/ads/rewarded', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'prepare', placement }),
    });
    const data = (await res.json().catch(() => ({}))) as RewardedVideoResult;
    if (!res.ok) {
      return { ...data, ok: false, error: data.error || `http_${res.status}` };
    }
    return data;
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'prepare_failed' };
  }
}

export async function completeRewardedVideo(
  user: { getIdToken: () => Promise<string> } | null | undefined,
  sessionId: string,
  opts?: {
    placement?: string;
    networkShown?: boolean;
    /** Monetag Promise resolve → must be 'completed' to credit */
    status?: 'completed' | 'failed' | string;
    meta?: Record<string, unknown>;
  }
): Promise<RewardedVideoResult> {
  if (!user) return { ok: false, error: 'not_signed_in' };
  if (!sessionId) return { ok: false, error: 'missing_session' };
  try {
    const token = await user.getIdToken();
    const res = await fetchWithTimeout('/api/ads/rewarded', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'complete',
        sessionId,
        placement: opts?.placement || 'offerwall_rewarded_video',
        networkShown: !!opts?.networkShown,
        status: opts?.status || '',
        meta: opts?.meta || {},
      }),
    });
    const data = (await res.json().catch(() => ({}))) as RewardedVideoResult;
    if (!res.ok) {
      return { ...data, ok: false, error: data.error || `http_${res.status}` };
    }
    return data;
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'complete_failed' };
  }
}
