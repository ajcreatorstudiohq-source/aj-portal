/**
 * Server FCM web push via Firebase Admin.
 */
import type { Messaging } from 'firebase-admin/messaging';
import { getAdminApp, getAdminDb } from './firebase-admin';

let messaging: Messaging | null = null;

export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    if (!messaging) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getMessaging } =
        require('firebase-admin/messaging') as typeof import('firebase-admin/messaging');
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (e) {
    console.warn('[firebase-admin] messaging init failed', e);
    return null;
  }
}

export async function sendPushToUser(opts: {
  toUid: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string; sent?: number }> {
  const toUid = String(opts.toUid || '').trim();
  if (!toUid) return { ok: false, error: 'missing_toUid' };

  const adminDb = getAdminDb();
  const msg = getAdminMessaging();
  if (!adminDb || !msg) {
    return { ok: false, error: 'admin_sdk_missing' };
  }

  const snap = await adminDb.collection('users').doc(toUid).get();
  if (!snap.exists) return { ok: false, error: 'user_not_found' };
  const token = String((snap.data() as { fcmToken?: string }).fcmToken || '').trim();
  if (!token) return { ok: false, error: 'no_fcm_token' };

  try {
    await msg.send({
      token,
      notification: {
        title: String(opts.title || 'AJ Super Portal').slice(0, 120),
        body: String(opts.body || '').slice(0, 240),
      },
      data: {
        ...(opts.data || {}),
        click_action: '/',
      },
      webpush: {
        fcmOptions: { link: '/' },
        notification: {
          icon: '/logo.png',
        },
      },
    });
    return { ok: true, sent: 1 };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : 'push_failed';
    // Clear dead tokens
    if (/not-registered|invalid-registration|registration-token/i.test(err)) {
      try {
        await adminDb.collection('users').doc(toUid).update({ fcmToken: '' });
      } catch {
        /* ignore */
      }
    }
    return { ok: false, error: err };
  }
}
