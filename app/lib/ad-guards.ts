/**
 * Block intrusive ads permanently:
 * - tag.gozen.com / gozen.com / alwingulla / sunny-sprout
 * - ALL Monetag (nap5k / monetag / multi-tag / push / popunder)
 *
 * Allowed ad network: Adsterra (effectivecpmnetwork.com) only.
 */

const BLOCKED_SCRIPT_SNIPPETS = [
  'push.min.js',
  'push.js',
  'in-page-push',
  'inpagepush',
  'popunder',
  'popunder.min',
  'vignette',
  'onclicka',
  'multi-tag',
  'multitag',
  'smartlink',
  'smart-tag',
  'smarttag',
  'notification.js',
  'tag.gozen.com',
  'gozen.com',
  'alwingulla.com',
  'alwingulla',
  'sunny-sprout.org',
  'sunnysprout',
  'omg10.com',
  'nap5k.com',
  'monetag',
  'al5sm.com',
  'n6wxm.com',
  'quge5.com',
  'propellerads',
  'propeller',
];

const BLOCKED_HOST_SNIPPETS = [
  'gozen.',
  'tag.gozen',
  'alwingulla.',
  'sunny-sprout',
  'sunnysprout',
  'omg10.com',
  'nap5k.',
  'monetag',
];

const BLOCKED_REDIRECT_HOSTS = [
  'tag.gozen.com',
  'gozen.com',
  'alwingulla.com',
  'sunny-sprout.org',
  'sunnysprout.org',
  'omg10.com',
  'nap5k.com',
  'monetag.com',
];

const ALLOWED_AD_HOSTS = [
  'effectivecpmnetwork.com',
  'adgem.com',
  'adunits.adgem.com',
  'monlix.com',
  'offers.monlix.com',
  'netlify.app',
  'ludoeliteroyal.netlify.app',
];

const INTRUSIVE_AD_SELECTORS = [
  '[class*="push-notification"]',
  '[class*="push_notification"]',
  '[class*="in-page-push"]',
  '[class*="inpagepush"]',
  '[id*="push-notification"]',
  '[id*="in-page-push"]',
  'iframe[src*="push"]',
  'iframe[src*="gozen"]',
  'iframe[src*="alwingulla"]',
  'iframe[src*="sunny-sprout"]',
  'iframe[src*="nap5k"]',
  'iframe[src*="monetag"]',
  'iframe[src*="omg10"]',
].join(',');

function hostIsBlocked(urlLike: string): boolean {
  const hay = String(urlLike || '').toLowerCase();
  if (!hay) return false;
  if (ALLOWED_AD_HOSTS.some((h) => hay.includes(h))) return false;
  return BLOCKED_REDIRECT_HOSTS.some((h) => hay.includes(h));
}

function scriptLooksBlocked(src: string, text = ''): boolean {
  const hay = `${src} ${text}`.toLowerCase();
  if (!hay.trim()) return false;
  if (ALLOWED_AD_HOSTS.some((h) => hay.includes(h))) return false;
  return (
    BLOCKED_SCRIPT_SNIPPETS.some((s) => hay.includes(s)) ||
    BLOCKED_HOST_SNIPPETS.some((s) => hay.includes(s))
  );
}

function nodeLooksLikeFloatingNotif(el: Element): boolean {
  try {
    const text = (el.textContent || '').toLowerCase();
    if (
      text.includes('you have 1 new message') ||
      text.includes('new message!') ||
      text.includes('demo account') ||
      text.includes('$50,000') ||
      text.includes('$50k') ||
      text.includes('50000 credited') ||
      text.includes('50,000 credited') ||
      (text.includes('credited') && text.includes('account') && text.length < 280)
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function stripIntrusiveAdNodes(root: ParentNode = document): number {
  if (typeof document === 'undefined') return 0;
  let removed = 0;
  try {
    root.querySelectorAll(INTRUSIVE_AD_SELECTORS).forEach((node) => {
      try {
        node.remove();
        removed += 1;
      } catch {
        /* ignore */
      }
    });
    document.querySelectorAll('body *').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (nodeLooksLikeFloatingNotif(el)) {
        try {
          el.remove();
          removed += 1;
        } catch {
          /* ignore */
        }
      }
    });
  } catch {
    /* ignore */
  }
  return removed;
}

export function blockIntrusiveAdScripts(): void {
  if (typeof document === 'undefined') return;
  try {
    document.querySelectorAll('script').forEach((script) => {
      const src = script.getAttribute('src') || '';
      const text = script.textContent || '';
      if (scriptLooksBlocked(src, text)) {
        try {
          script.remove();
        } catch {
          /* ignore */
        }
      }
    });
  } catch {
    /* ignore */
  }
}

export function guardClick(e?: { preventDefault?: () => void; stopPropagation?: () => void } | null) {
  try {
    e?.preventDefault?.();
    e?.stopPropagation?.();
  } catch {
    /* ignore */
  }
}

let redirectGuardInstalled = false;

export function installRedirectGuard(): void {
  if (typeof window === 'undefined' || redirectGuardInstalled) return;
  redirectGuardInstalled = true;
  try {
    const originalOpen = window.open.bind(window);
    window.open = function guardedOpen(
      url?: string | URL | undefined,
      target?: string,
      features?: string
    ) {
      const href = String(url || '');
      if (hostIsBlocked(href)) {
        console.warn('[AJ] Blocked popunder/redirect open:', href.slice(0, 120));
        return null;
      }
      return originalOpen(url as string, target, features);
    } as typeof window.open;
  } catch {
    /* ignore */
  }
  try {
    window.onbeforeunload = null;
  } catch {
    /* ignore */
  }
}

let guardStarted = false;

export function startIntrusiveAdGuard(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
  installRedirectGuard();
  if (guardStarted) {
    stripIntrusiveAdNodes();
    blockIntrusiveAdScripts();
    return () => {};
  }
  guardStarted = true;
  blockIntrusiveAdScripts();
  stripIntrusiveAdNodes();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLScriptElement) {
          const src = node.getAttribute('src') || '';
          if (scriptLooksBlocked(src, node.textContent || '')) {
            try {
              node.remove();
            } catch {
              /* ignore */
            }
          }
          return;
        }
        if (node instanceof HTMLElement) {
          if (node.matches?.(INTRUSIVE_AD_SELECTORS) || nodeLooksLikeFloatingNotif(node)) {
            try {
              node.remove();
            } catch {
              /* ignore */
            }
          }
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const interval = window.setInterval(() => {
    blockIntrusiveAdScripts();
    stripIntrusiveAdNodes();
  }, 1200);

  return () => {
    observer.disconnect();
    window.clearInterval(interval);
    guardStarted = false;
  };
}
