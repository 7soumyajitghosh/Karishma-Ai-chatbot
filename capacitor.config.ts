import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/**
 * Capacitor wraps the EXISTING Karishma web app (built by Vite into ./dist)
 * inside an Android WebView. The web app remains the single source of truth --
 * nothing here recreates or restyles any UI.
 */
const config: CapacitorConfig = {
  appId: 'com.karishma.ai',
  appName: 'Karishma',

  // The Vite build output. `cap sync android` copies this into the APK.
  webDir: 'dist',

  server: {
    // https://localhost is required so that localStorage, IndexedDB (Firestore
    // persistence) and the Web Crypto API all stay available inside the WebView.
    // Do NOT switch this to http, or Firestore + crypto features will break.
    androidScheme: 'https',
  },

  android: {
    // Matches the web app's page background (#FAF8F5) so there is no white
    // flash between the splash screen and the first paint.
    backgroundColor: '#FAF8F5',

    // The app only talks to HTTPS endpoints, so mixed content stays blocked.
    allowMixedContent: false,

    // Lets you inspect the running app from chrome://inspect while debugging.
    // Set to false for a Play Store release build.
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    Keyboard: {
      // 'native' lets Android resize the WebView itself, which is what the
      // existing `h-dvh` chat layout already expects.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
