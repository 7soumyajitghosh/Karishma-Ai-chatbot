# PROJECT_CONTEXT

- **App**: Karishma — AI friend chatbot (web + Android APK via Capacitor).
- **Stack**: React 19 + Vite + Tailwind 4 frontend (`src/`), Express backend (`server.ts` + `server/`),
  esbuild-bundled to `dist/server.cjs`. Firebase Firestore (user accounts), Supabase (chat history,
  durable OTP store), Brevo (OTP email), Firebase web config in `firebase-applet-config.json`.
- **Hosting**: Render free tier, Docker runtime, blueprint `render.yaml`, health check `/api/health`.
  Same host serves API + web app; Android APK points `VITE_API_BASE` at it.
- **AI providers**: server-side keys only. GLM (optional primary, Z.ai OpenAI-compatible endpoint),
  OpenRouter (Nemotron default), Gemini, keyless Pollinations as last resort.
- **Identity**: bot is "Karishma", creator Soumyajit Ghosh (hardcoded in `/api/chat` system prompt).
- **Auth**: email OTP (Brevo) + bcrypt, guest mode supported. Header/localStorage tokens, no cookies.
