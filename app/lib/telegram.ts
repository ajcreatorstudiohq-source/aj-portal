/**
 * Telegram Bot — admin alerts (server-only).
 * Prefer env vars; defaults match portal CEO bot until rotated.
 */
const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  '8678089315:AAHq1Ta4cYwJVhCag9r9E8qczVXDX_V89KE';
const TELEGRAM_ADMIN_CHAT_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || '8612011228';

export function getTelegramConfig() {
  return {
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_ADMIN_CHAT_ID,
  };
}

/** Send a plain-text message to the admin Telegram chat. */
export async function sendTelegramAdminAlert(text: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) {
    return { ok: false, error: 'telegram_not_configured' };
  }
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(text || '').slice(0, 3900),
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `http_${res.status}` };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'telegram_failed';
    return { ok: false, error: msg };
  }
}

export async function notifyAdminWithdrawRequest(opts: {
  uid: string;
  email?: string | null;
  username?: string | null;
  coins: number;
  method: string;
  payoutSummary?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const coins = Math.max(0, Math.floor(Number(opts.coins) || 0));
  const lines = [
    '🚨 AJ PORTAL — WITHDRAW REQUEST',
    '',
    `👤 User: ${opts.username || '—'}`,
    `🆔 UID: ${opts.uid}`,
    `✉️ Email: ${opts.email || '—'}`,
    `💰 Amount: ${coins.toLocaleString()} AJ Coins`,
    `💳 Method: ${opts.method || '—'}`,
  ];
  if (opts.payoutSummary) {
    lines.push(`📋 Payout: ${opts.payoutSummary}`);
  }
  lines.push('', '⏱ Status: pending — review in Admin panel');
  return sendTelegramAdminAlert(lines.join('\n'));
}
