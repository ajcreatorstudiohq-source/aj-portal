/**
 * Short shareable join codes (Ludo-style friend room).
 * Easy to copy / WhatsApp — friend pastes and joins instantly.
 *
 * Alphabet skips ambiguous 0/O, 1/I/L.
 */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Uppercase + strip spaces/dashes; map lookalikes to alphabet. */
export function normalizeJoinCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/0/g, '2') // 0 → nearest safe digit in alphabet
    .replace(/1/g, '2')
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '');
}

/** Random n-char code (default 6 ≈ Ludo room). */
export function generateJoinCode(length = 6): string {
  const n = Math.max(4, Math.min(10, Math.floor(length)));
  let out = '';
  const bytes =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(n))
      : Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < n; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export type JoinCodeKind = 'live' | 'pk';

/**
 * Live ID: 6 chars (e.g. A7K2M9).
 * PK Match ID: M + 5 chars (e.g. M3X8Q2) — still short to share like Ludo.
 */
export function generateTypedJoinCode(kind: JoinCodeKind): string {
  if (kind === 'pk') return `M${generateJoinCode(5)}`;
  return generateJoinCode(6);
}

/**
 * Allocate a unique Firestore document id using short codes.
 * Retries on collision.
 */
export async function allocateUniqueJoinCode(opts: {
  kind: JoinCodeKind;
  exists: (id: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> {
  const max = opts.maxAttempts ?? 12;
  for (let i = 0; i < max; i++) {
    const id = generateTypedJoinCode(opts.kind);
    const taken = await opts.exists(id);
    if (!taken) return id;
  }
  return `${generateTypedJoinCode(opts.kind)}${generateJoinCode(2)}`;
}
