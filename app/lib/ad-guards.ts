/**
 * Block intrusive ads permanently:
 * - tag.gozen.com / gozen.com
 * - sunny-sprout.org
 * - alwingulla.com
 * - Monetag push / in-page-push / popunder / smart-tag / multi-tag
 *
 * ONLY allowed ad SDK: Monetag rewarded video zone 11377822
 * (nap5k.com/tag.min.js with data-sdk + data-zone="11377822").
 */

const BLOCKED_SCRIPT_SNIPPETS = [
  'push.min.js',
  'push.js',
  'in-page-push',
  'inpagepush',
  'popunder',
  'popunder.min',
  'vignette',
  'onclick',
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
  'propellerads',
  'propeller',
];

const BLOCKED_HOST_SNIPPETS = [
  'push.',
  'ipp.',
  'notif.',
  'gozen.',
  'tag.gozen',
  'alwingulla.',
  'sunny-sprout',
  'sunnysprout',
  'omg10.com',
];

/** Domains that must never redirect / open popunders */
const BLOCKED_REDIRECT_HOSTS = [
  'tag.gozen.com',
  'gozen.com',
  'alwingulla.com',
  'sunny-sprout.org',
  'sunnysprout.org',
  'omg10.com',
  'propellerads.com',
];

/** DOM selectors for Monetag / Propeller in-page push notification widgets */
const INTRUSIVE_AD_SELECTORS = [
  '[class*="push-notification"]',
  '[class*="push_notification"]',
  '[class*="in-page-push"]',
  '[class*="inpagepush"]',
  '[class*="InPagePush"]',
  '[id*="push-notification"]',
  '[id*="push_notification"]',
  '[id*="in-page-push"]',
  '[class*="propeller"]',
  '[id*="propeller"]',
  'iframe[src*="push"]',
  'iframe[src*="notification"]',
  'iframe[src*="inpage"]',
  'iframe[src*="ipp"]',
  'iframe[src*="gozen"]',
  'iframe[src*="alwingulla"]',
  'iframe[src*="sunny-sprout"]',
  'iframe[src*="omg10"]',
  'div[style*="z-index: 214748"]',
  'div[style*="z-index:214748"]',
].join(',');

function hostIsBlocked(urlLike: string): boolean {
  const hay = String(urlLike || '').toLowerCase();
  if (!hay) return false;
  return BLOCKED_REDIRECT_HOSTS.some((h) => hay.includes(h));
}

function scriptLooksBlocked(src: string, text = '', zoneAttr = '', hasDataSdk = false): boolean {
  const hay = `${src} ${text} ${zoneAttr}`.toLowerCase();
  if (!hay.trim()) return false;
  // Allow ONLY zone 11377822 rewarded SDK tag with data-sdk
  if (
    hay.includes('nap5k.com') &&
    (hasDataSdk || hay.includes('data-sdk') || hay.includes('show_11377822')) &&
    (zoneAttr === '11377822' || hay.includes('11377822'))
  ) {
    return false;
  }
  // Bare Monetag / multi-tag without our zone = blocked (push/popunder risk)
  if (hay.includes('nap5k.com')) return true;
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
      text.includes('credited to your') ||
      text.includes('$50,000') ||
      text.includes('50000 credited') ||
      text.includes('50,000 credited') ||
      (text.includes('credited') && text.includes('account') && text.length < 280)
    ) {
      return true;
    }
    const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
    if (!style) return false;
    const pos = style.position;
    const z = Number.parseInt(style.zIndex || '0', 10) || 0;
    if ((pos === 'fixed' || pos === 'sticky') && z >= 99990) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.width < 420 && rect.height > 0 && rect.height < 220) {
        const cls = `${el.className || ''} ${el.id || ''}`.toLowerCase();
        if (
          cls.includes('push') ||
          cls.includes('notif') ||
          cls.includes('toast') ||
          cls.includes('ipp') ||
          text.includes('install') ||
          text.includes('claim') ||
          text.includes('credit')
        ) {
          return true;
        }
      }
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
      const hasSdk = script.hasAttribute('data-sdk');
      const zone = script.getAttribute('data-zone') || '';
      if (hasSdk && src.includes('nap5k.com') && zone === '11377822') return;
      if (scriptLooksBlocked(src, text, zone, hasSdk)) {
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

/**
 * Stop popunder / hijack scripts from capturing button clicks.
 * Call at the start of every earn / nav button handler.
 */
export function guardClick(e?: { preventDefault?: () => void; stopPropagation?: () => void } | null) {
  try {
    e?.preventDefault?.();
    e?.stopPropagation?.();
  } catch {
    /* ignore */
  }
}

let redirectGuardInstalled = false;

/**
 * Block automatic redirects / popunders to gozen, sunny-sprout, alwingulla, omg10, etc.
 * Allows same-origin navigation and intentional offerwall opens (ridefiles / bitlabs).
 */
export function installRedirectGuard(): void {
  if (typeof window === 'undefined' || redirectGuardInstalled) return;
  redirectGuardInstalled = true;

  const allowedOpenHosts = [
    'ridefiles.net',
    'dashboard.bitlabs.ai',
    'bitlabs.ai',
    'nowpayments.io',
    'api.nowpayments.io',
  ];

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
      try {
        const u = new URL(href, window.location.href);
        const host = u.hostname.toLowerCase();
        const isSame = host === window.location.hostname;
        const isAllowed = allowedOpenHosts.some((h) => host === h || host.endsWith(`.${h}`));
        const isHttp = u.protocol === 'http:' || u.protocol === 'https:';
        if (isHttp && !isSame && !isAllowed && hostIsBlocked(host)) {
          return null;
        }
      } catch {
        if (hostIsBlocked(href)) return null;
      }
      return originalOpen(url as string, target, features);
    } as typeof window.open;
  } catch {
    /* ignore */
  }

  try {
    const loc = window.location;
    const originalAssign = loc.assign.bind(loc);
    const originalReplace = loc.replace.bind(loc);
    loc.assign = ((url: string | URL) => {
      const href = String(url);
      if (hostIsBlocked(href)) {
        console.warn('[AJ] Blocked location.assign redirect:', href.slice(0, 120));
        return;
      }
      return originalAssign(url as string);
    }) as typeof loc.assign;
    loc.replace = ((url: string | URL) => {
      const href = String(url);
      if (hostIsBlocked(href)) {
        console.warn('[AJ] Blocked location.replace redirect:', href.slice(0, 120));
        return;
      }
      return originalReplace(url as string);
    }) as typeof loc.replace;
  } catch {
    /* ignore */
  }

  try {
    window.onbeforeunload = null;
    const desc = Object.getOwnPropertyDescriptor(window, 'onbeforeunload');
    if (!desc || desc.configurable) {
      let _ob: OnBeforeUnloadEventHandler = null;
      Object.defineProperty(window, 'onbeforeunload', {
        configurable: true,
        get() {
          return _ob;
        },
        set(v) {
          // Ignore ad scripts that set leave-page traps
          if (typeof v === 'function') {
            _ob = null;
            return;
          }
          _ob = v;
        },
      });
    }
  } catch {
    /* ignore */
  }
}

let guardStarted = false;

/**
 * Install MutationObserver + interval to keep push/popunder/IPP ads off the page.
 */
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

  // Intercept document.createElement('script') for blocked hosts
  try {
    const originalCreate = Document.prototype.createElement;
    Document.prototype.createElement = function patchedCreateElement(
      tagName: string,
      options?: ElementCreationOptions
    ) {
      const el = originalCreate.call(this, tagName, options);
      if (String(tagName).toLowerCase() === 'script') {
        const script = el as HTMLScriptElement;
        const desc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src') ||
          Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'src');
        try {
          let current = '';
          Object.defineProperty(script, 'src', {
            configurable: true,
            enumerable: true,
            get() {
              return current;
            },
            set(v: string) {
              const next = String(v || '');
              const zone = script.getAttribute('data-zone') || '';
              const hasSdk = script.hasAttribute('data-sdk');
              if (scriptLooksBlocked(next, script.textContent || '', zone, hasSdk)) {
                if (!(hasSdk && next.includes('nap5k.com') && zone === '11377822')) {
                  console.warn('[AJ] Blocked script src:', next.slice(0, 120));
                  current = '';
                  return;
                }
              }
              current = next;
              script.setAttribute('src', next);
            },
          });
        } catch {
          /* fallback: observe attribute */
          void desc;
        }
      }
      return el;
    } as typeof document.createElement;
  } catch {
    /* ignore */
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement) && !(node instanceof HTMLScriptElement)) return;
        if (node instanceof HTMLScriptElement) {
          const src = node.getAttribute('src') || '';
          const text = node.textContent || '';
          const zone = node.getAttribute('data-zone') || '';
          if (
            node.hasAttribute('data-sdk') &&
            src.includes('nap5k.com') &&
            zone === '11377822'
          ) {
            return;
          }
          if (scriptLooksBlocked(src, text, zone, node.hasAttribute('data-sdk'))) {
            try {
              node.remove();
            } catch {
              /* ignore */
            }
            return;
          }
        }
        if (node instanceof HTMLElement) {
          if (node.matches?.(INTRUSIVE_AD_SELECTORS) || nodeLooksLikeFloatingNotif(node)) {
            try {
              node.remove();
            } catch {
              /* ignore */
            }
            return;
          }
          try {
            node.querySelectorAll?.(INTRUSIVE_AD_SELECTORS).forEach((child) => {
              try {
                child.remove();
              } catch {
                /* ignore */
              }
            });
          } catch {
            /* ignore */
          }
        }
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const interval = window.setInterval(() => {
    blockIntrusiveAdScripts();
    stripIntrusiveAdNodes();
    try {
      window.onbeforeunload = null;
    } catch {
      /* ignore */
    }
  }, 1200);

  try {
    if (!document.getElementById('aj-block-intrusive-ads')) {
      const style = document.createElement('style');
      style.id = 'aj-block-intrusive-ads';
      style.textContent = `
        [class*="push-notification"],
        [class*="push_notification"],
        [class*="in-page-push"],
        [class*="inpagepush"],
        [id*="push-notification"],
        [id*="in-page-push"],
        iframe[src*="push"],
        iframe[src*="inpage"],
        iframe[src*="ipp"],
        iframe[src*="gozen"],
        iframe[src*="alwingulla"],
        iframe[src*="sunny-sprout"],
        iframe[src*="omg10"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }
  } catch {
    /* ignore */
  }

  return () => {
    observer.disconnect();
    window.clearInterval(interval);
    guardStarted = false;
  };
}
