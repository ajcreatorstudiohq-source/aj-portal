/**
 * TikTok-style 1:1 DMs — durable Firestore paths.
 *
 * chats/{sortedUidA_uidB}
 * chats/{chatId}/messages/{msgId}
 * users/{uid}/chat_partners/{otherUid}  — inbox / friend id list
 */

export const CHATS_COL = 'chats';
export const CHAT_PARTNERS_SUB = 'chat_partners';

export function buildDmChatId(uidA: string, uidB: string): string {
  return [String(uidA), String(uidB)].filter(Boolean).sort().join('_');
}

export function otherParticipant(chatId: string, myUid: string): string {
  const parts = String(chatId || '').split('_');
  // chatId is uid1_uid2 where uids may contain underscores — prefer participants array;
  // this helper is only a fallback when ids have no underscores.
  if (parts.length === 2) {
    return parts[0] === myUid ? parts[1] : parts[0];
  }
  return '';
}

export type ChatPartnerProfile = {
  uid: string;
  username?: string;
  name?: string;
  photo?: string;
  photoURL?: string;
};

export function normalizePartnerProfile(
  uid: string,
  data: Record<string, unknown> | null | undefined
): ChatPartnerProfile {
  const d = data || {};
  return {
    uid: String(uid),
    username: String(d.username || 'AJ_Member'),
    name: String(d.name || d.displayName || d.username || 'AJ Member'),
    photo: String(d.photo || d.photoURL || '/logo.png'),
    photoURL: String(d.photoURL || d.photo || '/logo.png'),
  };
}
