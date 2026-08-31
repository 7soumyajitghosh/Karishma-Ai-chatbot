/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the hosted Karishma backend (the Express app in
   * server.ts), e.g. https://karishma-xxxxx.a.run.app
   *
   * Left empty for the normal web build so that `/api/...` stays relative and
   * the browser behaviour is unchanged. Set in .env.android for the APK build,
   * where there is no local server to talk to.
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
