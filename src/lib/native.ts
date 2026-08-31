/**
 * Native (Android/Capacitor) adapter for the EXISTING Karishma web app.
 *
 * Everything in this file is a no-op when the app runs in a normal browser, so
 * the web version's behaviour is byte-for-byte unchanged. It exists only to
 * bridge the four things a WebView cannot infer on its own:
 *
 *   1. API base URL  - inside the APK there is no local Express server, so
 *                      relative `/api/...` requests must be pointed at the
 *                      hosted backend.
 *   2. Back button    - Android's hardware/gesture back must close the topmost
 *                      overlay instead of killing the app.
 *   3. System bars    - status bar colour has to follow the app's own theme.
 *   4. Safe areas     - adds a marker class so index.css can apply
 *                       env(safe-area-inset-*) padding only inside the app.
 *
 * No UI, colour, font, spacing or layout decision is made here.
 */

/* ------------------------------------------------------------------ *
 * Platform detection
 * ------------------------------------------------------------------ */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

function getCapacitor(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only when running inside the Android (or iOS) shell. */
export function isNativeApp(): boolean {
  const cap = getCapacitor();
  return Boolean(cap?.isNativePlatform?.());
}

/* ------------------------------------------------------------------ *
 * 1. API base URL
 * ------------------------------------------------------------------ */

const RUNTIME_API_BASE_KEY = 'karishma_api_base';

/**
 * Resolution order:
 *   1. localStorage["karishma_api_base"]  - lets you repoint a already-installed
 *      APK at a different backend without rebuilding (handy while testing).
 *   2. VITE_API_BASE from .env.android    - baked in at build time.
 *   3. ""                                  - keep relative URLs (browser case).
 */
export function getApiBase(): string {
  try {
    const override = window.localStorage.getItem(RUNTIME_API_BASE_KEY);
    if (override && /^https?:\/\//i.test(override)) {
      return override.replace(/\/+$/, '');
    }
  } catch {
    // localStorage can be unavailable in restricted storage modes.
  }

  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, '');
  }

  return '';
}

/**
 * Rewrites relative `/api/...` requests onto the hosted backend.
 *
 * A single fetch wrapper is used deliberately: it leaves all 27 existing
 * `fetch("/api/...")` call sites in App.tsx and selfHealing.ts completely
 * untouched, so request bodies, headers, error handling and loading states
 * behave exactly as they do on the web.
 *
 * Firestore traffic is not affected - the Firebase SDK uses absolute URLs and
 * its own transport, and only relative paths starting with `/api/` are touched.
 */
function installApiBaseRewrite(base: string): void {
  const originalFetch = window.fetch.bind(window);

  const rewrite = (url: string): string =>
    url.startsWith('/api/') || url === '/api' ? base + url : url;

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (typeof input === 'string') {
        return originalFetch(rewrite(input), init);
      }
      if (input instanceof Request && input.url) {
        // Requests created from a relative path resolve against the WebView
        // origin (https://localhost), so compare on the pathname.
        const parsed = new URL(input.url);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/')) {
          return originalFetch(new Request(base + parsed.pathname + parsed.search, input), init);
        }
      }
    } catch {
      // Fall through to the untouched request on any parsing problem.
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}

/* ------------------------------------------------------------------ *
 * 2. Android back button
 * ------------------------------------------------------------------ */

/**
 * Dispatches a cancelable `karishma:androidback` event. App.tsx listens for it
 * and calls preventDefault() when it closed an open overlay. If nothing handled
 * the press we fall back to history, then to a confirm-before-exit tap.
 */
async function installBackButton(): Promise<void> {
  let App: typeof import('@capacitor/app').App;
  try {
    ({ App } = await import('@capacitor/app'));
  } catch {
    return;
  }

  let exitArmedUntil = 0;

  App.addListener('backButton', ({ canGoBack }) => {
    const event = new CustomEvent('karishma:androidback', { cancelable: true });
    const handledByUi = !window.dispatchEvent(event);

    if (handledByUi) {
      exitArmedUntil = 0;
      return;
    }

    if (canGoBack && window.history.length > 1) {
      window.history.back();
      return;
    }

    // Nothing open and nowhere to go back to: require a second press so a
    // stray back gesture never discards an in-progress conversation.
    const now = Date.now();
    if (now < exitArmedUntil) {
      App.exitApp();
      return;
    }
    exitArmedUntil = now + 2000;

    // A native toast is used instead of rendering anything, so the web app's
    // own markup and styles stay exactly as they are.
    void (async () => {
      try {
        const { Toast } = await import('@capacitor/toast');
        await Toast.show({ text: 'Press back again to exit', duration: 'short' });
      } catch {
        // Toast plugin missing: the double-press still works silently.
      }
    })();
  });
}

/* ------------------------------------------------------------------ *
 * 3. System bars - follow the app's own light/dark theme
 * ------------------------------------------------------------------ */

async function installStatusBarThemeSync(): Promise<void> {
  let StatusBar: typeof import('@capacitor/status-bar').StatusBar;
  let Style: typeof import('@capacitor/status-bar').Style;
  try {
    ({ StatusBar, Style } = await import('@capacitor/status-bar'));
  } catch {
    return;
  }

  // These two values come straight from src/index.css so the bar can never
  // disagree with the page behind it.
  const LIGHT_BG = '#FAF8F5';
  const DARK_BG = '#121212';

  const apply = async () => {
    const isDark = document.documentElement.classList.contains('theme-dark');
    try {
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      await StatusBar.setBackgroundColor({ color: isDark ? DARK_BG : LIGHT_BG });
    } catch {
      // Older devices may reject setBackgroundColor under edge-to-edge; the
      // theme-color meta tag still covers the common case.
    }
  };

  void apply();

  // The theme is toggled by adding/removing `theme-dark` on <html>.
  new MutationObserver(() => void apply()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function initNativeShell(): void {
  if (!isNativeApp()) return;

  // 4. Marker class -> index.css applies safe-area padding only in the app.
  document.documentElement.classList.add('capacitor-native');

  const base = getApiBase();
  if (base) {
    installApiBaseRewrite(base);
  } else {
    console.error(
      '[Karishma] No backend URL configured for the Android build. Set ' +
        'VITE_API_BASE in .env.android and rebuild, or run ' +
        `localStorage.setItem("${RUNTIME_API_BASE_KEY}", "https://your-backend") ` +
        'from chrome://inspect. Until then every /api request will fail.'
    );
  }

  void installBackButton();
  void installStatusBarThemeSync();
}

initNativeShell();
