'use client';

/**
 * Agora RTC helpers for TikReels Live (host publish / audience subscribe).
 * Replaces legacy ZegoCloud + RTDB JPEG frame pipeline.
 */

import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID } from './agora-config';

export type AgoraLiveSession = {
  client: IAgoraRTCClient;
  localVideo?: ICameraVideoTrack;
  localAudio?: IMicrophoneAudioTrack;
  uid: number;
  channel: string;
};

let AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;

async function loadSdk() {
  if (AgoraRTC) return AgoraRTC;
  const mod = await import('agora-rtc-sdk-ng');
  AgoraRTC = mod.default;
  return AgoraRTC;
}

export async function fetchAgoraToken(opts: {
  channel: string;
  role: 'host' | 'audience';
  getIdToken: () => Promise<string>;
}): Promise<{ appId: string; token: string; uid: number; channel: string }> {
  const idToken = await opts.getIdToken();
  const res = await fetch('/api/agora/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ channel: opts.channel, role: opts.role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.token) {
    throw new Error(data.error || data.message || 'agora_token_failed');
  }
  return {
    appId: String(data.appId || AGORA_APP_ID),
    token: String(data.token),
    uid: Number(data.uid) || 0,
    channel: String(data.channel || opts.channel),
  };
}

/** Host: join channel and publish camera + mic into `videoContainer`. */
export async function startAgoraHost(opts: {
  channel: string;
  getIdToken: () => Promise<string>;
  videoContainer: HTMLElement;
}): Promise<AgoraLiveSession> {
  const rtc = await loadSdk();
  const creds = await fetchAgoraToken({
    channel: opts.channel,
    role: 'host',
    getIdToken: opts.getIdToken,
  });
  const client = rtc.createClient({ mode: 'live', codec: 'vp8' });
  await client.setClientRole('host');
  await client.join(creds.appId, creds.channel, creds.token, creds.uid);

  const [mic, cam] = await rtc.createMicrophoneAndCameraTracks(
    {},
    { facingMode: 'user' }
  );
  cam.play(opts.videoContainer);
  await client.publish([mic, cam]);

  return {
    client,
    localVideo: cam,
    localAudio: mic,
    uid: creds.uid,
    channel: creds.channel,
  };
}

/** Audience: join channel and play first remote video/audio into containers. */
export async function startAgoraAudience(opts: {
  channel: string;
  getIdToken: () => Promise<string>;
  videoContainer: HTMLElement;
}): Promise<AgoraLiveSession> {
  const rtc = await loadSdk();
  const creds = await fetchAgoraToken({
    channel: opts.channel,
    role: 'audience',
    getIdToken: opts.getIdToken,
  });
  const client = rtc.createClient({ mode: 'live', codec: 'vp8' });
  await client.setClientRole('audience');

  const playRemote = (
    videoTrack: IRemoteVideoTrack | undefined,
    audioTrack: IRemoteAudioTrack | undefined
  ) => {
    if (videoTrack) {
      opts.videoContainer.innerHTML = '';
      videoTrack.play(opts.videoContainer);
    }
    if (audioTrack) audioTrack.play();
  };

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'video') {
      playRemote(user.videoTrack, undefined);
    }
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  });

  client.on('user-unpublished', () => {
    /* keep container; host may republish */
  });

  await client.join(creds.appId, creds.channel, creds.token, creds.uid);

  // Already-published hosts
  client.remoteUsers.forEach(async (user) => {
    if (user.hasVideo) {
      await client.subscribe(user, 'video');
      playRemote(user.videoTrack, undefined);
    }
    if (user.hasAudio) {
      await client.subscribe(user, 'audio');
      user.audioTrack?.play();
    }
  });

  return {
    client,
    uid: creds.uid,
    channel: creds.channel,
  };
}

export async function stopAgoraSession(session: AgoraLiveSession | null | undefined) {
  if (!session) return;
  try {
    session.localVideo?.stop();
    session.localVideo?.close();
  } catch {
    /* ignore */
  }
  try {
    session.localAudio?.stop();
    session.localAudio?.close();
  } catch {
    /* ignore */
  }
  try {
    await session.client.unpublish().catch(() => {});
  } catch {
    /* ignore */
  }
  try {
    await session.client.leave();
  } catch {
    /* ignore */
  }
  try {
    session.client.removeAllListeners();
  } catch {
    /* ignore */
  }
}
