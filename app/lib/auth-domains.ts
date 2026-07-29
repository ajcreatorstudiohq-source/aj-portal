/**
 * Firebase Auth authorized-domain helpers for Netlify / Vercel previews.
 * OAuth requires the exact browser hostname in Firebase Authorized domains
 * (wildcards like *.netlify.app are NOT supported).
 */

/** Stable hosts that should always be authorized. */
export const BASE_AUTH_DOMAINS = [
  'localhost',
  'aj-super-portal.firebaseapp.com',
  'aj-super-portal.web.app',
  'aj-studio-portal.netlify.app',
  // Recent Netlify deploy previews (Google OAuth)
  'deploy-preview-95--aj-studio-portal.netlify.app',
  'deploy-preview-97--aj-studio-portal.netlify.app',
  'deploy-preview-98--aj-studio-portal.netlify.app',
] as const;

/** Optional extra hosts from env (comma-separated, no protocol). */
export function envExtraAuthDomains(): string[] {
  const raw =
    process.env.FIREBASE_EXTRA_AUTH_DOMAINS ||
    process.env.NEXT_PUBLIC_FIREBASE_EXTRA_AUTH_DOMAINS ||
    '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => s.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
}

/**
 * Only allow auto-registration for our known preview/production hosts.
 * Prevents arbitrary domain injection into Firebase Auth config.
 */
export function isAllowedPreviewAuthHost(host: string): boolean {
  const h = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!h) return false;
  if ((BASE_AUTH_DOMAINS as readonly string[]).includes(h)) return true;
  // Netlify deploy previews for this site: deploy-preview-95--aj-studio-portal.netlify.app
  if (/^deploy-preview-\d+--aj-studio-portal\.netlify\.app$/.test(h)) return true;
  // Netlify branch deploys: branch-name--aj-studio-portal.netlify.app
  if (/^[a-z0-9-]+--aj-studio-portal\.netlify\.app$/.test(h)) return true;
  // Vercel previews for this project (aj-portal-*.vercel.app or *.vercel.app owned names)
  if (/^aj-portal[a-z0-9-]*\.vercel\.app$/.test(h)) return true;
  if (/^[a-z0-9-]+-ajcreatorstudiohq-sources-projects\.vercel\.app$/.test(h)) return true;
  return envExtraAuthDomains().includes(h);
}

export function normalizeAuthHost(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export function mergeAuthorizedDomains(
  existing: string[],
  toAdd: string[]
): { next: string[]; added: string[] } {
  const set = new Set(
    existing.map((d) => normalizeAuthHost(d)).filter(Boolean)
  );
  const added: string[] = [];
  for (const raw of toAdd) {
    const h = normalizeAuthHost(raw);
    if (!h || !isAllowedPreviewAuthHost(h)) continue;
    if (!set.has(h)) {
      set.add(h);
      added.push(h);
    }
  }
  // Always ensure base domains
  for (const b of BASE_AUTH_DOMAINS) {
    if (!set.has(b)) {
      set.add(b);
      added.push(b);
    }
  }
  for (const e of envExtraAuthDomains()) {
    if (isAllowedPreviewAuthHost(e) && !set.has(e)) {
      set.add(e);
      added.push(e);
    }
  }
  return { next: Array.from(set).sort(), added };
}
