/**
 * Block Monetag push / in-page-push / popunder / floating notification ads.
 * Only rewarded interstitial (show_11377822 type:end) is allowed via monetag-client.
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
  'multi-tag',
  'multitag',
  'smartlink',
  'smart-tag',
  'smarttag',
  'notification',
  'tag.gozen.com',
  'gozen.com',
  'alwingulla.com',
  'alwingulla',
  'sunny-sprout.org',
  'sunnysprout',
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
  'div[style*="z-index: 214748"]',
  'div[style*="z-index:214748"]',
].join(',');

function scriptLooksBlocked(src: string, text = ''): boolean {
  const hay = `${src} ${text}`.toLowerCase();
  if (!hay.trim()) return false;
  if (hay.includes('data-sdk') && hay.includes('show_11377822')) return false;
  // Allow ONLY zone 11377822 interstitial SDK tag with data-sdk
  if (hay.includes('nap5k.com/tag.min.js') && hay.includes('data-sdk') && hay.includes('11377822')) {
    return false;
  }
  if (hay.includes('nap5k.com') && !hay.includes('data-sdk')) return true;
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

let guardStarted = false;

/**
 * Install MutationObserver + interval to keep push/popunder/IPP ads off the page.
 */
export function startIntrusiveAdGuard(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
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
          if (scriptLooksBlocked(src, text)) {
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
  }, 1500);

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
        iframe[src*="sunny-sprout"] {
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
