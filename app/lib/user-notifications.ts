/**
 * Client helpers — in-app + web push notifications.
 */
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../../firebaseConfig';

export type UserNotificationInput = {
  title: string;
  message: string;
  type?: string;
  fromUid?: string;
  fromUsername?: string;
  fromPhoto?: string;
  deepLink?: string;
  meta?: Record<string, unknown>;
};

/** Write an in-app notification under users/{uid}/notifications (permanent delete path). */
export async function writeUserNotification(
  toUid: string,
  input: UserNotificationInput
): Promise<string | null> {
  const uid = String(toUid || '').trim();
  if (!uid) return null;
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'notifications'), {
      title: String(input.title || 'AJ Portal').slice(0, 120),
      message: String(input.message || '').slice(0, 500),
      type: String(input.type || 'general'),
      fromUid: input.fromUid || '',
      fromUsername: input.fromUsername || '',
      fromPhoto: input.fromPhoto || '',
      deepLink: input.deepLink || '',
      meta: input.meta || {},
      read: false,
      createdAt: serverTimestamp(),
      date: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn('writeUserNotification', e);
    return null;
  }
}

/** Ask server to send FCM web push to target user. */
export async function requestWebPush(
  actor: User,
  opts: { toUid: string; title: string; body: string; data?: Record<string, string> }
): Promise<boolean> {
  try {
    const token = await actor.getIdToken();
    const res = await fetch('/api/notify/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(opts),
    });
    const data = await res.json().catch(() => ({}));
    return !!(res.ok && data.ok);
  } catch (e) {
    console.warn('requestWebPush', e);
    return false;
  }
}

/** In-app + push together (non-fatal). */
export async function notifyUser(
  actor: User | null,
  toUid: string,
  input: UserNotificationInput & { pushBody?: string }
): Promise<void> {
  if (!toUid || (actor && actor.uid === toUid)) return;
  await writeUserNotification(toUid, input);
  if (actor) {
    await requestWebPush(actor, {
      toUid,
      title: input.title,
      body: input.pushBody || input.message,
      data: { type: String(input.type || 'general') },
    });
  }
}

export function displayNotificationTitle(n: {
  title?: string;
  type?: string;
  fromUsername?: string;
}): string {
  if (n.title) return String(n.title);
  if (n.type === 'follow') return 'New Follower';
  if (n.type === 'message' || n.type === 'dm') return 'New Message';
  if (n.type === 'gift') return 'Gift Received';
  return 'AJ Portal';
}

export function displayNotificationMessage(n: {
  message?: string;
  type?: string;
  fromUsername?: string;
}): string {
  if (n.message) return String(n.message);
  if (n.type === 'follow') return `@${n.fromUsername || 'Someone'} followed you`;
  if (n.type === 'message' || n.type === 'dm')
    return `@${n.fromUsername || 'Someone'} sent you a message`;
  return '';
}
