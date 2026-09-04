package com.karishma.ai;

import com.getcapacitor.BridgeActivity;

/**
 * Host activity for the Karishma web app.
 *
 * BridgeActivity loads the Vite build that `cap sync` copied into
 * app/src/main/assets/public. There is deliberately no UI code here -- the
 * existing React app in src/ is the single source of truth for every screen.
 * Android-specific behaviour (back button, status bar, safe areas, API base URL)
 * lives in src/lib/native.ts on the web side.
 */
public class MainActivity extends BridgeActivity {}
