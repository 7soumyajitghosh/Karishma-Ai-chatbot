# KARISHMA — COMPLETE BUILD & DEBUG BRIEF

You are working on my existing project **Karishma**. Do NOT rebuild the project from scratch or randomly change working parts. First inspect the existing codebase and understand the current architecture, then fix the problems systematically.

## 1. Main Goal

Karishma must work reliably in both:

* Web application
* Android APK

Both platforms must use the **same production backend/API**.

The architecture should be:

Web → Karishma Backend → AI Provider/Model → Response
Android APK → Karishma Backend → AI Provider/Model → Response

Do NOT put secret API keys directly inside the frontend or APK.

---

## 2. AI Model Setup

My preferred/default model is:

**Nemotron**

Nemotron should remain the default model unless there is a technical reason it cannot be used.

Other models such as Gemma and GLM may be available as secondary/fallback models depending on the existing implementation.

Do not unnecessarily call multiple models for every message. Use proper model routing/fallback logic.

---

## 3. OpenRouter

OpenRouter has been discussed/used for accessing AI models.

The OpenRouter API key must be stored securely as a backend environment variable.

Correct architecture:

Frontend / APK
→ Backend
→ OpenRouter
→ Selected model
→ Backend
→ Frontend / APK

Never expose the OpenRouter secret key in:

* frontend source code
* React/Vite environment variables that are bundled into the browser
* Android APK
* GitHub repository
* public configuration files

---

## 4. Supabase

Supabase is being used for the application's backend data layer.

Potential responsibilities include:

* database
* authentication/user data
* conversations
* messages
* application data
* guest/session-related data where appropriate

The existing database structure must be inspected before changing it.

I previously worked with a DB JSON file intended to be uploaded into Supabase. Do not delete or modify database structures blindly. First inspect what the current application expects.

---

## 5. Guest Mode Bug

There is an important existing bug:

When a user selects **Guest Mode** and tries to join/use the application, the application redirects the user back to the login page.

Current problematic flow:

Guest Mode
→ Join
→ Login Page

Expected flow:

Guest Mode
→ Create/use guest session
→ Join
→ Application

Fix the authentication/routing logic so that guest users can actually enter the application without being unnecessarily redirected to the login page.

Do not break normal authenticated login while fixing guest mode.

---

## 6. Pollinations Problem

The existing backend previously produced an error similar to:

[Pollinations Chat Fallback]
Provider authentication/authorization error

and:

HTTP 402 — Payment Required

The existing Pollinations legacy text API fallback should NOT be treated as a reliable production fallback.

Inspect the current implementation and either:

1. remove/disable the broken Pollinations fallback, or
2. replace it with a properly configured alternative fallback.

Do not allow a failed Pollinations request to break the entire chat system.

The application should gracefully fall back to another configured model/provider when possible.

---

## 7. Render Deployment

The backend is intended to run on **Render**.

The backend must work correctly after deployment.

All server-side secrets/API credentials should be configured through Render Environment Variables.

For example:

OPENROUTER_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

Use the actual variable names already present in the codebase where possible instead of unnecessarily renaming everything.

Never hard-code secret values.

---

## 8. GitHub Security

The project may be pushed to GitHub.

Make sure secrets are NOT committed.

The project should have an appropriate `.gitignore`, including things such as:

.env
.env.local
node_modules/
dist/
build/

Check the existing repository for accidentally exposed API keys or secrets.

If a secret was previously exposed in source code, replace the code with environment-variable based configuration.

Do not print secret values in logs.

---

## 9. Web + APK Must Share One Backend

This is extremely important.

Do NOT create separate AI/backend implementations for Web and Android.

Correct:

```
                ┌── Web
                │
```

Karishma Backend ───┤
│
└── Android APK

Both clients should call the same backend endpoints.

For example:

POST /api/chat

The exact endpoint should be determined from the existing codebase.

The Android application should only know the public backend URL.

The APK must NOT contain:

* OpenRouter secret
* Supabase service-role key
* private provider credentials
* other backend secrets

---

## 10. Conversation Storage

Conversation history should be handled consistently between Web and APK.

Preferred architecture:

User
→ Karishma client
→ Backend
→ Supabase
→ conversation/message storage

Then responses are returned to the client.

Do not introduce another database/storage platform unless the existing project genuinely requires it.

---

## 11. Current Backend Debugging Requirement

Before changing code:

1. Inspect the complete backend structure.
2. Identify the backend entry point.
3. Identify all API routes.
4. Identify AI provider/model routing.
5. Identify authentication/guest-mode logic.
6. Identify Supabase integration.
7. Identify environment variables.
8. Identify frontend → backend communication.
9. Identify Android → backend communication.
10. Check Render deployment configuration.
11. Find why the current backend fails.
12. Fix the root causes rather than applying temporary patches.

After making changes, test the complete request flow.

---

## 12. Required Production Flow

The final production flow should be approximately:

User
↓
Karishma Web / Android
↓
Karishma Backend
↓
Authentication / Guest Session Check
↓
Conversation Context
↓
Model Router
↓
Nemotron (DEFAULT)
↓
Fallback model if necessary
↓
Response
↓
Save conversation/message to Supabase
↓
Return response
↓
Web / Android

---

## 13. Environment Variables

First inspect the existing code and tell me exactly which environment variables are required.

Do NOT invent unnecessary variables.

Separate them into:

### Backend-only secrets

These must stay on Render/server:

* OpenRouter API key
* Supabase service-role/private credentials
* other provider secrets

### Public client configuration

These can be exposed to the browser/APK only if genuinely public, such as:

* backend base URL
* Supabase public URL/key if the architecture actually requires it

Never expose service-role/private keys.

---

## 14. APK Build Requirement

The Android APK must connect to the deployed production backend.

Do not make the APK depend on:

* localhost
* my development computer
* local-only server
* private LAN IP

unless explicitly required for development mode.

Production:

Android APK
→ Public Render Backend
→ AI Provider + Supabase

---

## 15. Error Handling

The application should handle:

* API authentication errors
* 401
* 403
* 402
* timeout
* rate limit
* provider unavailable
* invalid model
* Supabase errors
* network errors

without crashing the entire application.

Return clean user-friendly errors to the frontend.

Do not expose API keys, stack traces containing secrets, or internal credentials to users.

---

## 16. Important Development Rule

Do not randomly rewrite working code.

For every change:

1. Explain what is currently wrong.
2. Explain why it is wrong.
3. Make the smallest safe fix.
4. Test it.
5. Check that existing functionality still works.

If something cannot be verified, clearly say so instead of pretending it works.

---

# FINAL TARGET

I want one stable Karishma system:

```
                KARISHMA

    ┌────────────┴────────────┐
    │                         │
  WEB                      ANDROID
    │                         │
    └────────────┬────────────┘
                 │
                 ▼
          ONE BACKEND
                 │
      ┌──────────┴──────────┐
      │                     │
  OpenRouter             Supabase
      │
  ┌───┴────┐
  │        │
```

Nemotron   Gemma/other
DEFAULT    fallback

Deployment:

GitHub
→ Render Backend
→ Production API

Web + APK
→ Same Production API

Secrets
→ Backend Environment Variables only

First inspect the existing project and report:

1. Current architecture
2. Current backend problems
3. Current API/provider configuration
4. Required environment variables
5. Guest Mode problem
6. Supabase configuration
7. Render deployment problems
8. Web/API connection problems
9. Android/API connection problems
10. Exact files that need modification

Then fix the issues systematically.

Do not ask me to rebuild everything from scratch unless the existing code is genuinely unusable.

                
FINAL KARISHMA ARCHITECTURE:

GitHub
  ↓
Render
  ↓
Karishma Backend
  ├── Nemotron API → DEFAULT/PRIMARY
  ├── Gemini API → FALLBACK
  ├── OpenRouter → ADDITIONAL/FALLBACK MODELS
  ├── Brevo → OTP EMAIL
  └── Supabase → OTP STORAGE + DATABASE/DATA
         ↑
         │
    ┌────┴────┐
    │         │
   WEB       APK

Web and APK must use the SAME Render backend.
All API keys stay server-side in Render ENV.
Never expose API keys in Web, APK, or GitHub.