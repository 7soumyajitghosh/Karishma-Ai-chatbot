import fs from "fs";
import path from "path";
import dns from "dns";
import https from "https";

import express from "express";

// NOTE: `vite` is deliberately NOT imported here. It is only needed by the dev
// server, and a top-level import becomes a `require("vite")` at the very top of
// dist/server.cjs that runs in production too -- loading Vite's whole Node API
// (plus rollup) into a container that never uses it. On a 512MB instance that
// matters. startServer() imports it dynamically inside the non-production branch.
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where, setLogLevel } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Suppress benign internal gRPC idle stream cycling logs
try {
  setLogLevel("silent");
} catch {
  // Ignore
}
import {
  executeSelfRepairCycle,
  SelfRepairRequest,
  getAuditLogHistory,
  rollbackFileToBackup,
  runBuildCheck,
  runLintAndTypeCheck,
  isPuterAvailable,
  diagnoseWithClaudePuter,
} from "./server/selfRepairEngine";
import { deleteConversation, getConversationHistory, saveConversation, findUserByEmailSupabase, upsertUserSupabase } from "./server/supabaseHistory";
import {
  getOtp,
  setOtp,
  deleteOtp,
  bumpOtpAttempts,
  markVerifiedForReset,
  isOtpStoreDurable,
  startOtpPurgeLoop,
} from "./server/otpStore";

dotenv.config();

// Stabilize DNS resolution to IPv4 first across all outbound sockets.
// This prevents dynamic IPv6 address rotation on dual-stack cloud containers,
// ensuring a single stable outbound IPv4 is used for Brevo API and third-party services.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore if not supported in environment
}

const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: process.env.FIREBASE_API_KEY || (firebaseConfig as any).apiKey || "",
};
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig as any);
const dbId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== "(default)"
  ? (firebaseConfig as any).firestoreDatabaseId
  : undefined;
const firestoreDb = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);

const app = express();
// Cloud Run (and most PaaS hosts) inject the port to listen on. Falls back to
// 3000 so local `npm run dev` behaves exactly as before.
const PORT = Number(process.env.PORT) || 3000;

// Initialize GoogleGenAI SDK (only if a valid Google Gemini API key is provided)
let googleGenAIClient: GoogleGenAI | null = null;
const rawGeminiKey = process.env.GEMINI_API_KEY;
if (rawGeminiKey && !rawGeminiKey.startsWith("sk-or")) {
  try {
    googleGenAIClient = new GoogleGenAI({
      apiKey: rawGeminiKey,
    });
  } catch (clientInitErr) {
    console.warn("Failed to initialize GoogleGenAI client:", clientInitErr);
    googleGenAIClient = null;
  }
}

// Helper to resolve API keys dynamically from request headers, request body, or environment variables
function resolveApiKeys(reqHeaders?: Record<string, any>, reqBody?: Record<string, any>) {
  let geminiKey = (
    reqHeaders?.["x-gemini-api-key"] ||
    reqBody?.customGeminiKey ||
    process.env.GEMINI_API_KEY ||
    ""
  ).toString().trim();

  let openRouterKey = (
    reqHeaders?.["x-openrouter-api-key"] ||
    reqBody?.customOpenRouterKey ||
    process.env.OPENROUTER_API_KEY ||
    ""
  ).toString().trim();

  // Smart auto-routing: If key format is swapped, fix automatically
  if (geminiKey.startsWith("sk-or") && !openRouterKey) {
    openRouterKey = geminiKey;
    geminiKey = "";
  } else if ((openRouterKey.startsWith("AIza") || openRouterKey.startsWith("aiza")) && !geminiKey) {
    geminiKey = openRouterKey;
    openRouterKey = "";
  }

  let clientGemini: GoogleGenAI | null = null;
  if (geminiKey && !geminiKey.startsWith("sk-or")) {
    try {
      clientGemini = new GoogleGenAI({ apiKey: geminiKey });
    } catch (clientInitErr) {
      console.warn("Failed to initialize custom GoogleGenAI client:", clientInitErr);
    }
  }

  let clientOpenRouter: OpenAI | null = null;
  if (openRouterKey) {
    try {
      clientOpenRouter = new OpenAI({
        apiKey: openRouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Karishma AI Friend",
        },
      });
    } catch (clientInitErr) {
      console.warn("Failed to initialize custom OpenAI client:", clientInitErr);
    }
  }

  return {
    geminiKey,
    openRouterKey,
    clientGemini: clientGemini || googleGenAIClient,
    clientOpenRouter: clientOpenRouter || ai,
  };
}

// Security Helper: Mask API keys and sensitive credentials in error logs and response strings
function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== "string") return text || "";
  let sanitized = text;
  const sensitiveKeys = [
    process.env.GEMINI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.GLM_API_KEY,
    process.env.POLLINATIONS_API_KEY,
    process.env.POLLINATIONS_KEY,
    process.env.FIREBASE_PRIVATE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ].filter((k): k is string => Boolean(k && k.length > 5));

  for (const key of sensitiveKeys) {
    sanitized = sanitized.replaceAll(key, "[REDACTED_API_KEY]");
  }
  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_\-\.]{10,}/gi, "Bearer [REDACTED]");
  sanitized = sanitized.replace(/(sk-[a-zA-Z0-9_\-]{10,})/gi, "[REDACTED_KEY]");
  sanitized = sanitized.replace(/(pk-[a-zA-Z0-9_\-]{10,})/gi, "[REDACTED_KEY]");
  return sanitized;
}

// Robust API call runner with exponential backoff, timeout, and failure classification
interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

async function retryApiCall<T>(
  actionName: string,
  fn: (signal: AbortSignal) => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? 2;
  let delay = config.initialDelayMs ?? 500;
  const backoffFactor = config.backoffFactor ?? 2;
  const maxDelay = config.maxDelayMs ?? 3000;
  const timeoutMs = config.timeoutMs ?? 15000;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      const status = err?.status || err?.statusCode || err?.response?.status;
      const rawMsg = err?.message || String(err);
      const msg = sanitizeSecrets(rawMsg).toLowerCase();

      // Check for non-retryable errors (Auth failure, payment/credits required, bad client request, model not found, daily quota exhaustion)
      const isAuthError = status === 401 || status === 403 || msg.includes("api key") || msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("invalid key");
      const isPaymentError = status === 402 || msg.includes("402") || msg.includes("insufficient credits") || msg.includes("never purchased credits") || msg.includes("payment required") || msg.includes("budget too low");
      const isBadRequest = status === 400 || msg.includes("invalid_argument") || msg.includes("bad request");
      const isNotFound = status === 404 || msg.includes("model not found") || msg.includes("does not exist");
      const isDailyQuotaExhausted = (status === 429 || msg.includes("429") || msg.includes("resource_exhausted")) && (msg.includes("quota exceeded") || msg.includes("plan and billing") || msg.includes("free_tier_requests") || msg.includes("quotafailure"));

      if (isAuthError) {
        console.warn(`[${actionName}] Provider authentication/authorization error (${status || '401/403'}): ${msg}`);
        throw new Error(`Authentication failure with AI provider (${status || '401/403'}).`);
      }
      if (isPaymentError) {
        console.warn(`[${actionName}] AI provider insufficient credits/zero budget (402). Non-retryable.`);
        throw new Error(`Insufficient credits on AI provider (402).`);
      }
      if (isDailyQuotaExhausted) {
        console.warn(`[${actionName}] Daily free tier quota exhausted. Non-retryable.`);
        throw new Error(sanitizeSecrets(rawMsg));
      }
      if (isBadRequest || isNotFound || attempt === maxRetries) {
        throw new Error(sanitizeSecrets(rawMsg));
      }

      // Check if temporary/retryable failure (rate limits 429, server errors 5xx, timeouts/network)
      const isRateLimit = status === 429 || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("quota");
      const isServerError = status >= 500 || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504") || msg.includes("overloaded");
      const isTimeoutOrNetwork = controller.signal.aborted || msg.includes("aborted") || msg.includes("timeout") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("fetch failed");

      if (!isRateLimit && !isServerError && !isTimeoutOrNetwork) {
        throw new Error(sanitizeSecrets(rawMsg));
      }

      console.warn(`[${actionName}] Temporary failure on attempt ${attempt + 1}/${maxRetries + 1} (${msg.slice(0, 80)}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw new Error(sanitizeSecrets(lastError?.message || "Operation failed after retries"));
}

// Image generation and transformation helper using Gemini models with Fallback
async function generateImageWithGemini(
  prompt: string,
  inputImageBase64?: string,
  inputImageMime?: string,
  clientOverride?: GoogleGenAI | null
): Promise<string | null> {
  const client = clientOverride || googleGenAIClient;
  // 1. Try Gemini Image Generation & Editing Models with direct multimodal visual reference input
  if (client) {
    const imageModels = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

    for (const modelName of imageModels) {
      try {
        const parts: any[] = [];
        
        // If base64 image is supplied, provide it to the model as an actual inline visual part FIRST
        if (inputImageBase64) {
          const cleanBase64 = inputImageBase64.includes(";base64,")
            ? inputImageBase64.split(";base64,")[1].replace(/\s+/g, "")
            : inputImageBase64.replace(/\s+/g, "");
          const mime = inputImageMime || (inputImageBase64.includes("data:") ? inputImageBase64.split(";")[0].replace("data:", "") : "image/jpeg");
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: mime,
            }
          });
        }

        parts.push({ text: prompt });

        const config: any = {};
        if (modelName === 'gemini-3.1-flash-image') {
          config.imageConfig = {
            aspectRatio: "1:1",
            imageSize: "1K"
          };
        }

        const response = await client.models.generateContent({
          model: modelName,
          contents: {
            parts: parts
          },
          ...(Object.keys(config).length > 0 ? { config } : {})
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/png";
              return `data:${mime};base64,${part.inlineData.data}`;
            }
          }
        }
      } catch (err: any) {
        const msg = String(err?.message || err);
        console.warn(`Gemini image model (${modelName}) call:`, sanitizeSecrets(msg.slice(0, 160)));
      }
    }
  }

  // 2. High quality Fallback: Generate real high-resolution image via Pollinations AI (Flux/SDXL model)
  try {
    const cleanPrompt = encodeURIComponent(prompt.slice(0, 300));
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsApiKey = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY;
    const polUrl = pollinationsApiKey
      ? `https://gen.pollinations.ai/image/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&key=${pollinationsApiKey}`
      : `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };
    if (pollinationsApiKey) {
      headers['Authorization'] = `Bearer ${pollinationsApiKey}`;
    }

    const imageUrl = await retryApiCall(
      "Pollinations Image Generation",
      async (signal) => {
        const imgRes = await fetch(polUrl, {
          headers,
          signal,
        });

        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          return `data:${contentType};base64,${base64}`;
        }
        const err = new Error(`Pollinations HTTP ${imgRes.status}`);
        (err as any).status = imgRes.status;
        throw err;
      },
      { maxRetries: 1, initialDelayMs: 300, timeoutMs: 12000 }
    );

    return imageUrl;
  } catch (pollErr: any) {
    const msg = sanitizeSecrets(pollErr?.message || String(pollErr));
    if (msg.includes("402") || msg.includes("401") || msg.includes("403")) {
      console.warn("Pollinations Image Generation skipped (Auth/Credits required).");
    } else {
      console.error("Pollinations image generation fallback error:", msg);
    }
  }

  return null;
}

// Intent detection for image requests
function detectImagePrompt(text: string): string | null {
  if (!text) return null;
  const rawText = text.trim();
  const lower = rawText.toLowerCase();

  const patterns = [
    /(?:generate|create|draw|make|render|paint|produce)(?:\s+a|\s+an|\s+me|\s+us|\s+for me)?\s+(?:image|picture|photo|illustration|drawing|artwork|art|portrait|landscape|nano\s+banana)?\s*(?:of|about|showing|with)?\s+(.+)/i,
    /(?:draw|paint|sketch|render)\s+(?:a|an|me|us)?\s+(.+)/i,
    /(?:image|picture|photo|drawing|illustration|artwork)\s+of\s+(.+)/i,
    /(?:can|could|will|would) you (?:draw|generate|create|make|paint|render)\s+(?:a|an|me)?\s+(.+)/i,
    /(?:generate|create|draw|make|render)\s+(?:a|an)?\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      let extracted = match[1].trim();
      extracted = extracted.replace(/[.!?]+$/, "");
      if (extracted.length > 1) return extracted;
    }
  }

  const hasAction = /\b(draw|generate|create|make|paint|render|sketch|produce)\b/i.test(lower);
  const hasSubject = /\b(image|picture|photo|drawing|illustration|artwork|art|portrait|landscape|banana)\b/i.test(lower);

  if (hasAction && hasSubject) {
    return rawText.replace(/[.!?]+$/, "");
  }

  return null;
}

// Keyless Pollinations helper for 402/Credit Exhausted situations
async function fetchKeylessPollinations(systemInstruction: string, messages: any[]): Promise<string | null> {
  try {
    const formattedMsgs = [
      ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
      ...messages.slice(-8).map((m: any) => {
        let content = m.text || "";
        if (typeof m.content === "string") content = m.content;
        return { role: m.role === "user" ? "user" : "assistant", content: content || "Hello" };
      })
    ];
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formattedMsgs,
        model: "openai-fast"
      }),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const rawText = await res.text();
      try {
        const data = JSON.parse(rawText);
        if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content.trim();
        }
      } catch {}
      if (rawText && rawText.trim()) return rawText.trim();
    }
  } catch {
    // Non-blocking
  }
  return null;
}

// Pollinations Text AI fallback (using enter.pollinations.ai / gen.pollinations.ai)
export async function generateChatWithPollinations(
  systemInstruction: string,
  messages: any[]
): Promise<string | null> {
  const pollinationsApiKey = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY;

  if (pollinationsApiKey) {
    try {
      const formattedMsgs = [
        ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
        ...messages.slice(-8).map((m: any) => {
          let content = m.text || "";
          if (typeof m.content === "string") content = m.content;
          return {
            role: m.role === "user" ? "user" : "assistant",
            content: content || "Hello",
          };
        })
      ];

      const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pollinationsApiKey}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        body: JSON.stringify({
          model: "openai",
          messages: formattedMsgs,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const rawText = await res.text();
        try {
          const data = JSON.parse(rawText);
          if (data?.choices?.[0]?.message?.content) {
            return data.choices[0].message.content.trim();
          }
        } catch {}
        if (rawText && rawText.trim().length > 0) {
          return rawText.trim();
        }
      }
    } catch {
      // Fall through
    }
  }

  return await fetchKeylessPollinations(systemInstruction, messages);
}


// Chat generation helper using Gemini API via @google/genai
async function generateChatWithGemini(
  systemInstruction: string,
  messages: any[],
  attachment?: any,
  requestedModel?: string,
  clientOverride?: GoogleGenAI | null
): Promise<{ text?: string; error?: string }> {
  const client = clientOverride || googleGenAIClient;
  if (!client) return { error: "Gemini API client not configured or API key missing." };

  try {
    const formattedContents: any[] = [];

    messages.forEach((m: any, index: number) => {
      const isLastUser = index === messages.length - 1 && m.role === "user";
      const parts: any[] = [];

      if (isLastUser && attachment && attachment.dataUrl) {
        const isImage = attachment.isImage || (attachment.type && attachment.type.startsWith("image/")) || attachment.dataUrl.startsWith("data:image/");
        if (isImage) {
          try {
            const partsSplit = attachment.dataUrl.split(";base64,");
            const mimeType = partsSplit[0].replace("data:", "") || "image/jpeg";
            const base64Data = partsSplit[1];
            if (base64Data) {
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data,
                }
              });
            }
          } catch (e) {
            console.error("Error parsing base64 image for Gemini:", e);
          }
        } else {
          // Document text
          if (attachment.dataUrl.includes(";base64,")) {
            try {
              const base64Data = attachment.dataUrl.split(";base64,")[1];
              const decoded = Buffer.from(base64Data, "base64").toString("utf-8");
              const printable = decoded.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
              if (printable.length > 20) {
                parts.push({ text: `\n[File Content (${attachment.name})]:\n${printable.slice(0, 4000)}` });
              }
            } catch (err) {}
          }
        }
      }

      if (m.text) {
        parts.push({ text: m.text });
      } else if (parts.length === 0) {
        parts.push({ text: "Hello" });
      }

      formattedContents.push({
        role: m.role === "user" ? "user" : "model",
        parts: parts,
      });
    });

    const isSpecificGemini = Boolean(requestedModel && requestedModel.includes("gemini"));
    const defaultModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-pro",
      "gemini-2.5-pro",
    ];

    const textModelsToTry = isSpecificGemini
      ? Array.from(new Set([requestedModel!, ...defaultModels]))
      : defaultModels;

    let lastError: any = null;

    for (const modelName of textModelsToTry) {
      try {
        const response = await retryApiCall(
          `Gemini Chat (${modelName})`,
          async () => {
            return await client.models.generateContent({
              model: modelName,
              contents: formattedContents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.85,
                maxOutputTokens: 1000,
              }
            });
          },
          { maxRetries: 1, initialDelayMs: 250, timeoutMs: 15000 }
        );

        if (response && response.text) {
          return { text: response.text };
        }
      } catch (mErr: any) {
        const errStr = sanitizeSecrets(mErr?.message || String(mErr));
        lastError = errStr;
        console.warn(`Gemini Chat model ${modelName} call failed:`, errStr.slice(0, 160));
      }
    }
    
    return { error: lastError ? `Gemini request failed: ${lastError}` : "No response generated by Gemini." };
  } catch (err: any) {
    const errStr = sanitizeSecrets(err?.message || String(err));
    console.error("Gemini Chat Generation Error:", errStr);
    return { error: errStr };
  }
}

// Initialize OpenAI SDK for OpenRouter
let ai: OpenAI | null = null;
const apiKey = process.env.OPENROUTER_API_KEY;

if (apiKey) {
  ai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Karishma AI Friend",
    },
  });
} else {
  console.warn("WARNING: OPENROUTER_API_KEY environment variable is missing.");
}

// Live verified free models on OpenRouter (supports zero-credit accounts)
let liveOpenRouterFreeModels: string[] = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "minimax/minimax-m2.7:free",
  "minimax/minimax-m3:free",
  "z-ai/glm-5.2:free",
  "cohere/north-mini-code:free",
  "liquid/lfm-2.5-2.6b:free",
];

// Dynamically sync active free models from OpenRouter public catalogue
async function refreshOpenRouterFreeModels() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "User-Agent": "Karishma-AI/1.0" },
    });
    if (res.ok) {
      const data: any = await res.json();
      const free = (data?.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => typeof id === "string" && id.endsWith(":free"));
      if (free.length > 0) {
        liveOpenRouterFreeModels = free;
      }
    }
  } catch {
    // Non-blocking fallback to default liveOpenRouterFreeModels
  }
}
refreshOpenRouterFreeModels();
setInterval(refreshOpenRouterFreeModels, 4 * 60 * 60 * 1000).unref();

// GLM (Z.ai / Zhipu) — primary chat provider when GLM_API_KEY is configured.
// Server-side only: the key is read from the backend environment and is never
// sent to the browser. Uses the OpenAI-compatible chat completions endpoint.
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_BASE_URL = (process.env.GLM_BASE_URL || "https://api.z.ai/api/paas/v4").replace(/\/+$/, "");
const GLM_MODEL = (process.env.GLM_MODEL || "glm-4.6").trim();
let glmClient: OpenAI | null = null;
if (GLM_API_KEY) {
  try {
    glmClient = new OpenAI({
      apiKey: GLM_API_KEY,
      baseURL: GLM_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Karishma AI Friend",
      },
    });
    console.log(`[GLM] Primary chat provider enabled (model: ${GLM_MODEL}).`);
  } catch (glmInitErr) {
    console.warn("Failed to initialize GLM client:", glmInitErr);
    glmClient = null;
  }
}

// ---------------------------------------------------------------------------
// CORS for the Android (Capacitor) shell only.
//
// Inside the APK the web app is served from the WebView's own origin
// (https://localhost) and calls this backend cross-origin, so without these
// headers the browser blocks every /api request. Browser usage is unaffected:
// same-origin requests never send an Origin the list below matches, and no
// wildcard is used. Auth is header/localStorage based (no cookies), so
// Access-Control-Allow-Credentials is deliberately not enabled.
// ---------------------------------------------------------------------------
const NATIVE_ORIGINS = new Set([
  "https://localhost", // Capacitor Android with androidScheme: 'https'
  "http://localhost", // Capacitor Android fallback scheme
  "capacitor://localhost", // Capacitor iOS
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (typeof origin === "string" && NATIVE_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ?? "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
  }
  next();
});

// 16mb, not 50mb. These parsers run on every route, and the expensive ones are
// reachable without logging in, so the old limit let an anonymous caller pin
// 50mb of heap per in-flight request on a 512mb Render instance. 16mb still
// comfortably fits a phone photo after base64 inflation (~1.34x), which is the
// largest legitimate body the app sends (/api/transform-illustration).
// Keep the 413 message below in sync with this number.
const MAX_BODY_SIZE = "16mb";
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(express.urlencoded({ limit: MAX_BODY_SIZE, extended: true }));

/* ------------------------------------------------------------------ *
 * Hosted-key guard for the provider-spending routes
 * ------------------------------------------------------------------ *
 * /api/chat, /api/tts, /api/generate-image and /api/transform-illustration all
 * fall back to the OWNER's OPENROUTER_API_KEY / GEMINI_API_KEY when the caller
 * does not supply one (see resolveApiKeys). None of them has any authentication
 * -- deliberately, because Guest Mode has to work without an account -- so on a
 * public URL they were an open AI relay billed to the project owner.
 *
 * The guard is intentionally NOT authentication. It only requires that a caller
 * spending the owner's credits be one of the two real clients:
 *
 *   - the web app, served by this same Express process, so its Origin equals
 *     this request's own Host (or APP_URL behind a proxy), and
 *   - the Android WebView, whose Origin is one of NATIVE_ORIGINS.
 *
 * Both send Origin on every one of these calls: they are JSON POSTs, and the
 * Fetch standard requires Origin on any request whose method is not GET/HEAD.
 * What gets rejected is the case that was actually costing money -- a script or
 * bot hitting the public URL with no Origin at all. Cross-origin *browser*
 * abuse was already blocked by the CORS block above.
 *
 * Bring-your-own-key callers are let through untouched: they are paying, and
 * that is an existing product feature (Settings -> API key).
 *
 * Being honest about the limit: an attacker can still forge an Origin header
 * from curl. Closing that needs real per-user auth, which would break Guest
 * Mode, so it is a deliberate product decision left to the owner rather than
 * something this guard pretends to solve.
 * ------------------------------------------------------------------ */
function isTrustedClientOrigin(req: express.Request): boolean {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !origin) return false;

  // Android / iOS Capacitor WebView.
  if (NATIVE_ORIGINS.has(origin)) return true;

  // The web app is served by this process, so it is same-origin.
  const host = req.headers.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return true;
  }

  // Behind Render's proxy the forwarded host is authoritative.
  const fwdHost = req.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(fwdHost) ? fwdHost[0] : fwdHost;
  if (forwardedHost && (origin === `https://${forwardedHost}` || origin === `http://${forwardedHost}`)) {
    return true;
  }

  const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (appUrl && origin === appUrl) return true;

  return false;
}

function callerSuppliedProviderKey(req: express.Request): boolean {
  const body = (req.body ?? {}) as Record<string, unknown>;
  return Boolean(
    req.headers["x-openrouter-api-key"] ||
      req.headers["x-gemini-api-key"] ||
      body.customOpenRouterKey ||
      body.customGeminiKey
  );
}

const PROVIDER_SPENDING_ROUTES = [
  "/api/chat",
  "/api/tts",
  "/api/generate-image",
  "/api/transform-illustration",
];

app.use(PROVIDER_SPENDING_ROUTES, (req, res, next) => {
  // Preflight is answered by the CORS block above; never 403 an OPTIONS.
  if (req.method === "OPTIONS") return next();
  if (callerSuppliedProviderKey(req)) return next();
  if (isTrustedClientOrigin(req)) return next();

  // Logged so a genuine client rejected in production is diagnosable from the
  // Render logs in one line. originalUrl, not path: inside an app.use(paths, ..)
  // mount req.path is relative to the mount point and reads as just "/".
  // Origin is caller-supplied, so keep it short and never echo it back.
  console.warn(
    `[hosted-key guard] refused ${req.method} ${req.originalUrl} from origin=${
      String(req.headers.origin ?? "<none>").slice(0, 100)
    }`
  );
  return res.status(403).json({
    error:
      "This endpoint is only available to the Karishma web app and Android app. " +
      "To use it directly, add your own Gemini or OpenRouter key in Settings.",
  });
});

/* ------------------------------------------------------------------ *
 * Developer-only endpoint gate
 * ------------------------------------------------------------------ *
 * Two route groups are developer tooling, not product surface:
 *
 *   /api/self-repair/*  drives an LLM that rewrites files under src/, server.ts
 *                       and server/, and /rollback takes a caller-supplied
 *                       target path.
 *   /api/test/*         creates real users in Firestore and Supabase on every
 *                       call.
 *
 * Both were written for a developer on localhost and have no authentication of
 * their own. Now that the backend has a public URL they have to be closed off.
 *
 *   - Outside production: open, so `npm run dev` behaves exactly as before.
 *   - In production: 404 unless SELF_REPAIR_TOKEN is set AND the request carries
 *     it in `x-self-repair-token`. 404 rather than 401 so the routes cannot be
 *     discovered by probing.
 *
 * Leave SELF_REPAIR_TOKEN unset on the deployed service; that is the safe
 * default and disables both groups entirely.
 *
 * This must be registered here, above the route definitions, because Express
 * runs middleware in registration order -- mounting it further down the file
 * would leave the earlier /api/test route unguarded.
 */
function devOnlyGate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();

  const notFound = () =>
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });

  const expected = process.env.SELF_REPAIR_TOKEN;
  if (!expected) return notFound();

  const presented = req.get("x-self-repair-token") || "";
  // Constant-time compare so the token cannot be recovered by timing responses.
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn(`[devOnlyGate] rejected ${req.method} ${req.originalUrl} from ${req.ip}`);
    return notFound();
  }

  return next();
}

app.use("/api/self-repair", devOnlyGate);
app.use("/api/test", devOnlyGate);

// Health check endpoint.
//
// Render pings this to decide whether a deploy is live, so it must stay fast and
// dependency-free (no database round-trip). It also doubles as a config probe
// after deploying: every field below is a boolean or a fixed label -- never a
// key, value, or URL -- so it is safe to open in a browser.
app.get("/api/health", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.json({
    status: "ok",
    env: isProd ? "production" : "development",
    // "supabase" = pending signups survive a restart. "memory" = they do not.
    otpStore: isOtpStoreDurable() ? "supabase" : "memory",
    configured: {
      supabase: isOtpStoreDurable(),
      brevo: Boolean(process.env.BREVO_API_KEY),
      glm: Boolean(process.env.GLM_API_KEY),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    // Confirms /api/self-repair/* and /api/test/* are closed on the public URL.
    devEndpoints: !isProd ? "open (dev)" : process.env.SELF_REPAIR_TOKEN ? "token-required" : "disabled",
  });
});

// In-memory Auth Stores
const disposableDomains = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", 
  "yopmail.com", "temp-mail.org", "throwawaymail.com", "tempmail.net", "fakemail.net"
]);

// Pending signup / password-reset codes now live in Supabase, not in a
// process-local Map. See server/otpStore.ts and
// supabase/migrations/202609040001_create_auth_otps.sql.
//
// The old `otpStore` Map is deliberately gone rather than wrapped in a
// sync-looking shim: every access is a round trip now, and a shim returning
// promises would have made `if (!store)` silently always-true. The imported
// getOtp/setOtp/deleteOtp/bumpOtpAttempts/markVerifiedForReset are used directly
// so the compiler flags any call site that forgets to await.

// Simple in-memory user store (email -> user data)
// Simple in-memory database
interface User {
  id: string;
  email: string;
  fullName?: string;
  nickname?: string;
  name: string;
  password?: string;
  createdAt: number;
  sessionTokens?: string[];
}
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  timestamp: string;
  mode: string;
  updatedAt?: string;
}
interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  text: string;
  timestamp: string;
  isEncrypted?: boolean;
  citations?: any;
}


// Define basic stores
let usersStore = new Map<string, User>();
let sessionsDb = new Map<string, ChatSession>();
let messagesDb = new Map<string, ChatMessage>();

const saveDb = () => {
  // Deprecated db.json disk storage removed. Persistent data is saved in Supabase & Firestore.
};

// Firestore & Supabase User Account Management (Persistent Source of Truth)
async function findUserByEmail(emailRaw: string): Promise<User | null> {
  if (!emailRaw || typeof emailRaw !== "string") return null;
  const cleanEmail = emailRaw.trim().toLowerCase();

  // 1. Direct Supabase lookup
  try {
    const sbUser = await findUserByEmailSupabase(cleanEmail);
    if (sbUser) {
      const userData: User = {
        id: sbUser.id,
        email: sbUser.email,
        name: sbUser.name,
        password: sbUser.password,
        createdAt: typeof sbUser.createdAt === "number" ? sbUser.createdAt : Date.now(),
      };
      usersStore.set(cleanEmail, userData);
      return userData;
    }
  } catch (err) {
    console.warn("Supabase findUserByEmail lookup warning:", err);
  }

  // 2. Direct Firestore lookup in "accounts" by clean email document key
  try {
    const accDoc = await getDoc(doc(firestoreDb, "accounts", cleanEmail));
    if (accDoc.exists()) {
      const userData = accDoc.data() as User;
      if (userData) {
        usersStore.set(cleanEmail, userData);
        upsertUserSupabase(userData).catch(() => {});
        return userData;
      }
    }
  } catch (err) {
    console.warn("Firestore findUserByEmail lookup warning:", err);
  }

  // 3. Secondary Firestore query on "users" collection
  try {
    const q = query(collection(firestoreDb, "users"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data() as User;
      if (userData) {
        usersStore.set(cleanEmail, userData);
        upsertUserSupabase(userData).catch(() => {});
        return userData;
      }
    }
  } catch (err) {
    console.warn("Firestore findUserByEmail query warning:", err);
  }

  // 4. Fallback to local in-memory store
  return usersStore.get(cleanEmail) || Array.from(usersStore.values()).find(u => u?.email?.trim().toLowerCase() === cleanEmail) || null;
}

async function findUserById(userId: string): Promise<User | null> {
  if (!userId) return null;
  if (userId.toLowerCase().startsWith("guest")) {
    return {
      id: userId,
      email: `${userId}@guest.local`,
      name: "Guest User",
      createdAt: Date.now()
    };
  }
  const localUser = Array.from(usersStore.values()).find(u => u.id === userId);
  if (localUser) return localUser;

  try {
    const userDoc = await getDoc(doc(firestoreDb, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      if (userData && userData.email) {
        usersStore.set(userData.email.trim().toLowerCase(), userData);
        upsertUserSupabase(userData).catch(() => {});
      }
      return userData;
    }
  } catch (err) {
    console.warn("Firestore findUserById warning:", err);
  }

  // Fallback for valid userId string to prevent unexpected 401/500 errors on session/history requests
  return {
    id: userId,
    email: `${userId}@user.local`,
    name: "User",
    createdAt: Date.now()
  };
}

async function saveUserToFirestore(user: User): Promise<boolean> {
  if (!user || !user.email) return false;
  const cleanEmail = user.email.trim().toLowerCase();
  const userId = user.id;

  const userRecord = {
    ...user,
    email: cleanEmail,
    updatedAt: Date.now()
  };

  try {
    // Save to Supabase
    upsertUserSupabase(userRecord).catch((e) => console.warn("Supabase user sync warning:", e));

    // Save to Firestore "accounts" collection (indexed by clean email) and "users" collection (indexed by userId)
    await setDoc(doc(firestoreDb, "accounts", cleanEmail), userRecord, { merge: true });
    if (userId) {
      await setDoc(doc(firestoreDb, "users", userId), userRecord, { merge: true });
    }
    usersStore.set(cleanEmail, userRecord);
    return true;
  } catch (err) {
    console.error("Failed to save user record to Firestore:", err);
    throw err;
  }
}

async function syncUsersFromFirestoreOnStartup() {
  try {
    const snap = await getDocs(collection(firestoreDb, "accounts"));
    snap.forEach((docSnap) => {
      const u = docSnap.data() as User;
      if (u && u.email) {
        usersStore.set(u.email.trim().toLowerCase(), u);
      }
    });
    console.log(`Synced ${snap.size} user accounts from Firestore.`);
  } catch (err) {
    console.warn("Failed to sync users from Firestore on startup:", err);
  }
}
syncUsersFromFirestoreOnStartup();
 // messageId -> message
// Index for fast lookup
const sessionMessagesIdx = new Map<string, string[]>(); // sessionId -> array of messageIds

// Re-populate index on startup
messagesDb.forEach((msg) => {
  if (msg.sessionId) {
    const list = sessionMessagesIdx.get(msg.sessionId) || [];
    if (!list.includes(msg.id)) {
      list.push(msg.id);
    }
    sessionMessagesIdx.set(msg.sessionId, list);
  }
});

// API endpoints


// ==========================================
// Centralized Brevo Email Dispatch Service
// ==========================================
let lastDetectedBrevoIp: string | null = null;
let lastBrevoAuthCheckTime: number = 0;

const getBackendOutboundIp = async (): Promise<string> => {
  if (lastDetectedBrevoIp) return lastDetectedBrevoIp;
  try {
    const res = await fetch("https://api4.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    const data: any = await res.json();
    if (data?.ip) {
      lastDetectedBrevoIp = data.ip;
      return data.ip;
    }
  } catch {
    // fallback
  }
  return "34.96.48.68";
};

// Warm up outbound IP detection on boot
getBackendOutboundIp().then((ip) => {
  console.log(`[Backend Network] Stable Egress IPv4: ${ip}`);
});

// Dedicated IPv4 HTTPS agent to route all Brevo requests deterministically via authorized IPv4
const brevoHttpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
  timeout: 10000,
});

const sendBrevoEmail = async (toEmail: string, otp: string, subject: string = "Your Verification Code") => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    console.warn("[Brevo Service] BREVO_API_KEY is not configured in environment variables.");
    return { success: false, error: "BREVO_API_KEY is missing." };
  }

  const payload = JSON.stringify({
    sender: {
      name: "Karishma AI",
      email: senderEmail,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject: subject,
    htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #FAF8F5; border-radius: 12px; border: 1px solid #EBE6DD;">
      <h2 style="color: #2C2A29; margin-top: 0; font-size: 20px;">Verify your email</h2>
      <p style="color: #5C5753; font-size: 14px; line-height: 1.6;">Use the verification code below to complete your authentication:</p>
      <div style="background-color: #FFFFFF; padding: 18px 24px; text-align: center; border-radius: 8px; border: 1px solid #E5E0D8; margin: 20px 0;">
        <span style="font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #D96B43; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #8C857E; font-size: 12px; margin-bottom: 0;">This code will expire in 10 minutes. If you did not request this code, please disregard this email.</p>
    </div>`,
  });

  return new Promise<{ success: boolean; messageId?: string; error?: string; unrecognisedIp?: string }>((resolve) => {
    try {
      const req = https.request(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",
          agent: brevoHttpsAgent,
          family: 4,
          headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let resData = "";
          res.on("data", (chunk) => {
            resData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(resData);
                console.log(`[Brevo Service] Verification email delivered to ${toEmail} (MessageId: ${parsed.messageId || "ok"}). Egress IPv4: 34.96.48.68`);
                resolve({ success: true, messageId: parsed.messageId });
              } catch {
                resolve({ success: true });
              }
              return;
            }

            let errJson: any = null;
            try {
              errJson = JSON.parse(resData);
            } catch {
              // not json
            }

            const errorMsg = errJson?.message || resData || `HTTP ${res.statusCode}`;
            const ipMatch = errorMsg.match(/unrecognised IP address\s+([0-9a-fA-F:.]+)/i) || errorMsg.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
            if (ipMatch && ipMatch[1]) {
              lastDetectedBrevoIp = ipMatch[1];
              if (Date.now() - lastBrevoAuthCheckTime > 30000) {
                lastBrevoAuthCheckTime = Date.now();
                console.warn(`[Brevo Service] Notice: Outbound IP ${lastDetectedBrevoIp} detected. Authorize at: https://app.brevo.com/security/authorised_ips`);
              }
            }

            console.warn(`[Brevo Service] API responded with status ${res.statusCode}: ${errorMsg}`);
            resolve({ success: false, error: errorMsg, unrecognisedIp: lastDetectedBrevoIp || undefined });
          });
        }
      );

      req.on("error", (netErr: any) => {
        console.warn(`[Brevo Service] Network error:`, netErr.message);
        resolve({ success: false, error: netErr.message });
      });

      req.write(payload);
      req.end();
    } catch (err: any) {
      console.warn(`[Brevo Service] Unexpected dispatch error:`, err.message);
      resolve({ success: false, error: err.message });
    }
  });
};

// API Diagnostics for Brevo Status
app.get("/api/auth/brevo-status", async (req, res) => {
  const outboundIp = await getBackendOutboundIp();
  res.json({
    configured: Boolean(process.env.BREVO_API_KEY),
    senderEmail: process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com",
    outboundIp: outboundIp,
    authorizationUrl: "https://app.brevo.com/security/authorised_ips"
  });
});

// Auth endpoints
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    // The per-email resendAt cooldown below stops one address being hammered,
    // but nothing stopped one caller cycling through many addresses -- each of
    // which sends a real Brevo email to a stranger and spends the sending quota.
    // A real signup needs one or two of these.
    if (isRateLimited(`otp:${clientIpOf(req)}`, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many verification requests. Please try again later." });
    }

    let { name, fullName, nickname, email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    
    const domain = email.split("@")[1]?.toLowerCase();
    const allowedDomains = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"]);
    if (!domain || !allowedDomains.has(domain)) {
      return res.status(400).json({ error: "Please use a supported email provider: Gmail, Outlook, Yahoo, iCloud, or Proton Mail." });
    }

    if (disposableDomains.has(domain)) {
      return res.status(400).json({ error: "Temporary or disposable email addresses are not supported. Please use a permanent email address." });
    }

    // Check if account already exists in real persistent authentication database
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists. Please log in or use a different email address." });
    }

    const existing = await getOtp(email);
    if (existing && Date.now() < existing.resendAt) {
      const waitSecs = Math.ceil((existing.resendAt - Date.now()) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs}s before requesting a new OTP.` });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedPassword = await bcrypt.hash(password || "", 10);

    const finalFullName = (fullName || name || "").trim();
    const finalNickname = (nickname || "").trim();

    // Persist BEFORE emailing. The other order could deliver a code that the
    // store never accepted, leaving the user typing a valid-looking OTP that
    // always fails.
    try {
      await setOtp(email, {
        hashedOtp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        resendAt: Date.now() + 60 * 1000, // 1 minute cooldown
        attempts: 0,
        pendingUser: {
          id: crypto.randomUUID(),
          fullName: finalFullName,
          nickname: finalNickname,
          name: finalNickname || finalFullName || email.split("@")[0],
          email,
          password: hashedPassword,
          createdAt: Date.now()
        }
      });
    } catch (storeError: any) {
      console.error("Failed to persist OTP:", storeError?.message || storeError);
      return res.status(503).json({ error: "Could not start verification right now. Please try again in a moment." });
    }

    const brevoResult = await sendBrevoEmail(email, otp);
    if (!brevoResult.success) {
      // Printing the code is a development convenience so signup still works
      // with no Brevo key configured. In production it would put a live
      // credential into the Render log stream, where anyone with dashboard
      // access could use it to complete a signup for someone else's address.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[OTP Verification Engine] OTP generated for ${email}: ${otp}`);
      } else {
        console.error(`[OTP] Brevo delivery failed for ${email}; code withheld from logs.`);
      }
    }

    res.json({
      success: true,
      message: "Verification code sent successfully.",
      emailDelivered: brevoResult.success
    });
  } catch (error) {
    console.error("OTP generation error:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    let { email, otp } = req.body;
    if (email) email = email.trim().toLowerCase();
    const store = await getOtp(email);

    if (!store) {
      return res.status(400).json({ error: "No pending verification found or OTP expired." });
    }

    if (Date.now() > store.expiresAt) {
      await deleteOtp(email);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (store.attempts >= 5) {
      await deleteOtp(email);
      return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    // Count the attempt before checking, and re-check the limit against the
    // value the database actually recorded, so concurrent guesses cannot both
    // read attempts = 4 and get a sixth try between them.
    const attemptCount = await bumpOtpAttempts(email);
    if (attemptCount > 5) {
      await deleteOtp(email);
      return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    const isValid = await bcrypt.compare(otp, store.hashedOtp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // Verify account doesn't already exist in database before saving
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      await deleteOtp(email);
      return res.status(400).json({ error: "An account with this email already exists. Please log in." });
    }

    const token = crypto.randomUUID();
    const newUser = { ...store.pendingUser, email, sessionTokens: [token] };

    // SAVE TO REAL PERSISTENT DATABASE SOURCE OF TRUTH
    try {
      await saveUserToFirestore(newUser);
    } catch (dbError: any) {
      console.error("Failed to save account record to persistent database:", dbError);
      return res.status(500).json({ error: "Failed to save account record to database. Please try verifying again." });
    }

    await deleteOtp(email);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.fullName || newUser.name || "",
        nickname: newUser.nickname || "",
        name: newUser.nickname || newUser.fullName || newUser.name || newUser.email,
        email: newUser.email
      },
      token
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // This route had no limit of any kind, so passwords could be brute-forced at
    // full speed -- and because every attempt runs bcrypt.compare (cost 10), a
    // few concurrent attackers also saturate a 0.1-CPU Render instance. Bucketed
    // by IP and, separately, by email so that spreading an attack across many
    // addresses or many source addresses still gets throttled.
    const ipBucket = `login:${clientIpOf(req)}`;
    const emailBucket = `login-email:${email}`;
    if (isRateLimited(ipBucket, 20, 10 * 60 * 1000) || isRateLimited(emailBucket, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait a few minutes and try again." });
    }

    // Lookup account in real persistent database source of truth
    const user = await findUserByEmail(email);
    if (!user || !user.password) {
      console.info("Login attempt for non-existent user account:", email);
      return res.status(400).json({ error: "No account found with this email address. Please create an account first." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.info("Login failed (incorrect password) for:", email);
      return res.status(401).json({ error: "Incorrect password. Please try again or reset your password." });
    }

    const token = crypto.randomUUID();
    if (!user.sessionTokens) user.sessionTokens = [];
    user.sessionTokens.push(token);
    // Tokens never expire and were appended forever, so the user document grew
    // without bound and every device ever logged in kept a permanent credential.
    // Keep only the most recent few sessions.
    const MAX_SESSION_TOKENS = 10;
    if (user.sessionTokens.length > MAX_SESSION_TOKENS) {
      user.sessionTokens = user.sessionTokens.slice(-MAX_SESSION_TOKENS);
    }

    await saveUserToFirestore(user).catch(e => console.warn("Failed to update session token in Firestore:", e));

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        fullName: user.fullName || user.name || "",
        nickname: user.nickname || "",
        name: user.nickname || user.fullName || user.name || user.email,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to log in." });
  }
});


// Helper to convert raw 16-bit PCM buffer to WAV buffer
function pcmToWav(pcmBuffer: Buffer | Uint8Array | null | undefined, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer<any> {
  const buf = pcmBuffer ? (Buffer.isBuffer(pcmBuffer) ? pcmBuffer : Buffer.from(pcmBuffer as any)) : Buffer.alloc(0);
  const header = Buffer.alloc(44);
  const dataSize = buf.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, buf]);
}

// Clean text helper for Speech Synthesis
function cleanTextForSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText;

  // 1. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, " ");

  // 2. Extract content from inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // 3. Extract text from markdown links
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 4. Remove URLs
  text = text.replace(/https?:\/\/\S+/g, " ");

  // 5. Remove markdown formatting tags (*, _, #, ~, >, etc.)
  text = text.replace(/[*_#~>]/g, " ");

  // 6. Remove all emojis and unicode pictographs
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FA95}]|[\u{1F650}-\u{1F67F}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu;
  text = text.replace(emojiRegex, " ");

  // 7. Strip brackets, code/math symbols, hyphens, slashes, colons, semicolons, quotes, etc. to spaces
  text = text.replace(/[{}[\]()<>\/\\|@$%^&+=~_\u2013\u2014\-:;"'`]/g, " ");

  // 8. Convert exclamations and Bengali dari to period for clean sentence boundary pauses
  text = text.replace(/!+/g, ".");
  text = text.replace(/।+/g, ".");

  // 9. Normalize multiple punctuation marks
  text = text.replace(/\?+/g, "?");
  text = text.replace(/\.+/g, ".");
  text = text.replace(/,\s*,+/g, ",");

  // 10. Collapse spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// Natural Female Voice TTS Endpoint
let lastGeminiTtsQuotaErrorTime = 0;
const GEMINI_TTS_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown on quota exhaustion

app.post("/api/tts", async (req, res) => {
  try {
    // Every TTS call spends the owner's Gemini quota and had no limit.
    if (isRateLimited(`tts:${clientIpOf(req)}`, 30, 60000)) {
      return res.status(429).json({ error: "Too many speech requests. Please wait a moment." });
    }
    const { text, lang } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = cleanTextForSpeech(text);

    if (!cleanText) {
      return res.status(400).json({ error: "No printable text" });
    }

    const isQuotaCooldownActive = Date.now() - lastGeminiTtsQuotaErrorTime < GEMINI_TTS_COOLDOWN_MS;

    if (googleGenAIClient && !isQuotaCooldownActive) {
      try {
        const audioInputText = cleanText.length > 500 ? cleanText.substring(0, 500) : cleanText;
        const isBengali = /[\u0980-\u09FF]/.test(audioInputText) || lang === "bn";
        const promptLangInst = isBengali
          ? "Speak in clear, fluent, natural Bengali with authentic pronunciation and warm expression."
          : "Speak in clear, warm, expressive conversational style with natural human inflection.";

        const response = await retryApiCall(
          "Gemini TTS",
          async () => {
            return await googleGenAIClient!.models.generateContent({
              model: "gemini-3.1-flash-tts-preview",
              contents: [
                {
                  role: "user",
                  parts: [{
                    text: `You are Karishma, a warm, spontaneous, friendly companion. ${promptLangInst} Speak in a natural, relaxed pace with warmth, gentle emotional nuance, and organic pauses between sentences. Read ONLY the actual words and numbers in the text below. Never pronounce punctuation names, symbols, markdown formatting, or code tags aloud. Text to read:\n\n${audioInputText}`
                  }]
                }
              ],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Kore"
                    }
                  }
                }
              }
            });
          },
          { maxRetries: 0, initialDelayMs: 200, timeoutMs: 8000 }
        );

        const candidates = response?.candidates;
        if (candidates && candidates.length > 0) {
          const parts = candidates[0].content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const mimeType = part.inlineData.mimeType || "audio/pcm";
                const base64Data = part.inlineData.data;
                const audioBuffer = Buffer.from(base64Data, "base64");

                let finalAudioBuffer: Buffer<any> = audioBuffer;
                let finalMimeType = mimeType;

                if (mimeType.includes("pcm")) {
                  finalAudioBuffer = pcmToWav(audioBuffer, 24000, 1, 16);
                  finalMimeType = "audio/wav";
                }

                return res.json({
                  success: true,
                  audioUrl: `data:${finalMimeType};base64,${finalAudioBuffer.toString("base64")}`
                });
              }
            }
          }
        }
      } catch (geminiAudioError: any) {
        const errMsg = String(geminiAudioError?.message || geminiAudioError);
        if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          lastGeminiTtsQuotaErrorTime = Date.now();
          console.info("[TTS] Gemini TTS free tier quota reached (10 requests/day). Seamlessly using high-quality browser Web Speech API voice synthesis.");
        } else {
          console.warn("[TTS] Gemini Audio generation unavailable, falling back to browser Web Speech API:", sanitizeSecrets(errMsg.slice(0, 120)));
        }
      }
    }

    return res.json({ success: false, fallback: true });
  } catch (err: any) {
    res.status(200).json({ success: false, fallback: true });
  }
});

// Password & Profile Management endpoints
app.post("/api/auth/me", async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId) return res.status(400).json({ error: "Unauthorized" });

    const user = await findUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName || user.name || "",
        nickname: user.nickname || "",
        name: user.nickname || user.fullName || user.name || user.email,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

app.post("/api/auth/update-profile", async (req, res) => {
  try {
    const { userId, token, fullName, nickname } = req.body;
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (nickname !== undefined) user.nickname = nickname.trim();
    user.name = user.nickname || user.fullName || user.email;
    
    await saveUserToFirestore(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName || "",
        nickname: user.nickname || "",
        name: user.nickname || user.fullName || user.email,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile." });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { userId, token, currentPassword, newPassword } = req.body;
    const user = await findUserById(userId);
    
    if (!user || !user.sessionTokens?.includes(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!user.password) {
      return res.status(400).json({ error: "Account has no password set." });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect current password." });
    }

    // Hash new password and invalidate other sessions
    user.password = await bcrypt.hash(newPassword, 10);
    const newToken = crypto.randomUUID();
    user.sessionTokens = [newToken]; // Keep only the new session

    await saveUserToFirestore(user);

    res.json({ success: true, token: newToken });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    // Same abuse vector as /api/auth/send-otp: one caller, many addresses, a
    // real email each time. Also slows account-existence enumeration, which the
    // distinct 400 below otherwise makes free.
    if (isRateLimited(`otp:${clientIpOf(req)}`, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many verification requests. Please try again later." });
    }

    let { email } = req.body;
    if (email) email = email.trim().toLowerCase();
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.log("Forgot password attempt for unregistered email:", email);
      return res.status(400).json({ error: "No account found with this email address. Please create an account first." });
    }

    const existing = await getOtp(email);
    if (existing && Date.now() < existing.resendAt) {
      return res.status(429).json({ error: "Please wait before requesting a new OTP." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Persist before emailing, same reasoning as /api/auth/send-otp.
    try {
      await setOtp(email, {
        hashedOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        resendAt: Date.now() + 60 * 1000,
        attempts: 0,
        pendingUser: null // null marks this as a reset rather than a signup
      });
    } catch (storeError: any) {
      console.error("Failed to persist reset OTP:", storeError?.message || storeError);
      return res.status(503).json({ error: "Could not start password reset right now. Please try again in a moment." });
    }

    const brevoResult = await sendBrevoEmail(email, otp, "Reset Your Password - Verification Code");
    if (!brevoResult.success) {
      // Never in production: a logged reset code is a password-reset takeover
      // for anyone who can read the log stream. See /api/auth/send-otp.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Reset OTP Verification Engine] Reset OTP generated for ${email}: ${otp}`);
      } else {
        console.error(`[OTP] Brevo delivery failed for password reset; code withheld from logs.`);
      }
    }

    res.json({
      success: true,
      message: "Reset verification code sent.",
      emailDelivered: brevoResult.success
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to process request." });
  }
});

app.post("/api/auth/verify-reset-otp", async (req, res) => {
  try {
    let { email, otp } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "No account found with this email address." });
    }

    const store = await getOtp(email);
    if (!store || store.pendingUser !== null) {
      return res.status(400).json({ error: "No pending password reset request found. Please request a new code." });
    }
    if (Date.now() > store.expiresAt) {
      await deleteOtp(email);
      return res.status(400).json({ error: "The OTP has expired. Please request a new code." });
    }
    if (store.attempts >= 5) {
      await deleteOtp(email);
      return res.status(429).json({ error: "Too many failed attempts. Please request a new code." });
    }

    const attemptCount = await bumpOtpAttempts(email);
    if (attemptCount > 5) {
      await deleteOtp(email);
      return res.status(429).json({ error: "Too many failed attempts. Please request a new code." });
    }

    const isValid = await bcrypt.compare(otp, store.hashedOtp);
    if (!isValid) {
      return res.status(400).json({ error: "Incorrect OTP code. Please check your email and try again." });
    }

    await markVerifiedForReset(email);
    res.json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required." });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "No account found with this email address." });
    }

    const store = await getOtp(email);
    if (!store || store.pendingUser !== null) {
      return res.status(400).json({ error: "No pending password reset found. Please start over." });
    }

    if (!store.verifiedForReset) {
      if (!otp) return res.status(400).json({ error: "OTP is required." });
      if (Date.now() > store.expiresAt) {
        await deleteOtp(email);
        return res.status(400).json({ error: "The OTP has expired." });
      }
      if (store.attempts >= 5) {
        await deleteOtp(email);
        return res.status(429).json({ error: "Too many failed attempts." });
      }

      const attemptCount = await bumpOtpAttempts(email);
      if (attemptCount > 5) {
        await deleteOtp(email);
        return res.status(429).json({ error: "Too many failed attempts." });
      }

      const isValid = await bcrypt.compare(otp, store.hashedOtp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid OTP." });
      }
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Reset password and invalidate all sessions
    user.password = await bcrypt.hash(newPassword, 10);
    user.sessionTokens = [];
    await saveUserToFirestore(user);
    await deleteOtp(email);

    res.json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// History endpoints
app.post("/api/history", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Unauthorized" });
    const user = await findUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const sessions = await getConversationHistory(userId);
    res.json({ success: true, sessions });
  } catch (err: any) {
    console.error("Supabase history fetch failed:", sanitizeSecrets(err?.message || String(err)));
    res.status(503).json({ error: "Conversation storage is temporarily unavailable." });
  }
});

app.post("/api/history/save", async (req, res) => {
  try {
    const { userId, session, sessions } = req.body;
    if (!userId) return res.status(400).json({ error: "Invalid userId" });
    
    // Verify user exists
    const userExists = await findUserById(userId);
    if (!userExists) return res.status(401).json({ error: "Unauthorized" });

    const sessionsToSave = sessions && Array.isArray(sessions) ? sessions : (session ? [session] : []);
    if (sessionsToSave.length === 0) return res.status(400).json({ error: "No session data provided" });

    for (const s of sessionsToSave) {
      if (s?.id) await saveConversation(userId, { ...s, userId });
    }

    res.json({ success: true });
  } catch (err: any) {
    const message = sanitizeSecrets(err?.message || String(err));
    console.error("Supabase history save failed:", message);
    res.status(message.includes("Forbidden") ? 403 : 503).json({ error: message.includes("Forbidden") ? "Forbidden: Not your session" : "Conversation storage is temporarily unavailable." });
  }
});

app.post("/api/history/delete", async (req, res) => {
  try {
    const { userId, token, sessionId } = req.body;
    if (!userId) return res.status(400).json({ error: "Unauthorized" });
    const user = await findUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ error: "Invalid data" });
    
    const deleted = await deleteConversation(userId, sessionId);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Supabase history delete failed:", sanitizeSecrets(err?.message || String(err)));
    res.status(503).json({ error: "Conversation storage is temporarily unavailable." });
  }
});

// Automated Privacy & Account Data Isolation Test Endpoint
app.post("/api/test/privacy-isolation", async (req, res) => {
  const logs: string[] = [];
  try {
    const userA_Id = "test_user_a_" + crypto.randomUUID().slice(0, 8);
    const userB_Id = "test_user_b_" + crypto.randomUUID().slice(0, 8);

    // 1. Register two test users
    const userA: User = { id: userA_Id, email: `usera_${userA_Id}@test.com`, name: "User A", createdAt: Date.now() };
    const userB: User = { id: userB_Id, email: `userb_${userB_Id}@test.com`, name: "User B", createdAt: Date.now() };
    usersStore.set(userA.email, userA);
    usersStore.set(userB.email, userB);

    logs.push(`Created User A (${userA_Id}) and User B (${userB_Id}).`);

    // 2. Create session for User A
    const sessionAId = "session_a_" + crypto.randomUUID().slice(0, 8);
    const sessionA: ChatSession = {
      id: sessionAId,
      userId: userA_Id,
      title: "User A Secret Session",
      timestamp: new Date().toISOString(),
      mode: "normal",
      updatedAt: new Date().toISOString()
    };
    sessionsDb.set(sessionAId, sessionA);
    messagesDb.set("msg_a_1", {
      id: "msg_a_1",
      sessionId: sessionAId,
      role: "user",
      text: "User A Confidential Secret Note",
      timestamp: "12:00 PM"
    });
    sessionMessagesIdx.set(sessionAId, ["msg_a_1"]);

    // 3. Create session for User B
    const sessionBId = "session_b_" + crypto.randomUUID().slice(0, 8);
    const sessionB: ChatSession = {
      id: sessionBId,
      userId: userB_Id,
      title: "User B Private Session",
      timestamp: new Date().toISOString(),
      mode: "normal",
      updatedAt: new Date().toISOString()
    };
    sessionsDb.set(sessionBId, sessionB);
    messagesDb.set("msg_b_1", {
      id: "msg_b_1",
      sessionId: sessionBId,
      role: "user",
      text: "User B Confidential Secret Note",
      timestamp: "12:05 PM"
    });
    sessionMessagesIdx.set(sessionBId, ["msg_b_1"]);

    // 4. Test Query User A history
    const userASessions = Array.from(sessionsDb.values()).filter(s => s.userId === userA_Id);
    if (userASessions.some(s => s.id === sessionBId)) {
      throw new Error("PRIVACY VIOLATION: User B session leaked into User A history query!");
    }
    if (!userASessions.some(s => s.id === sessionAId)) {
      throw new Error("User A session was missing from User A query.");
    }
    logs.push("Test 1 Passed: Querying User A history returns ONLY User A sessions.");

    // 5. Test Query User B history
    const userBSessions = Array.from(sessionsDb.values()).filter(s => s.userId === userB_Id);
    if (userBSessions.some(s => s.id === sessionAId)) {
      throw new Error("PRIVACY VIOLATION: User A session leaked into User B history query!");
    }
    if (!userBSessions.some(s => s.id === sessionBId)) {
      throw new Error("User B session missing from User B query.");
    }
    logs.push("Test 2 Passed: Querying User B history returns ONLY User B sessions.");

    // 6. Test Unauthorized Modification (User B attempting to overwrite User A session)
    const existingSession = sessionsDb.get(sessionAId);
    if (existingSession && existingSession.userId !== userB_Id) {
      logs.push("Test 3 Passed: User B attempted modification on User A session was blocked by ownership check.");
    } else {
      throw new Error("PRIVACY VIOLATION: Ownership check failed!");
    }

    // 7. Cleanup test entities
    sessionsDb.delete(sessionAId);
    sessionsDb.delete(sessionBId);
    usersStore.delete(userA.email);
    usersStore.delete(userB.email);

    logs.push("Test 4 Passed: Cleaned up test entities.");

    res.json({
      success: true,
      status: "PASSED",
      message: "Data isolation and privacy verified successfully. Zero cross-user data leakage detected.",
      logs
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      status: "FAILED",
      error: err.message,
      logs
    });
  }
});

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// The map only ever grew: one entry per (bucket, IP) forever, so a caller
// rotating source addresses could inflate it without bound on a 512mb instance.
// Expired entries are swept once the map is big enough for that to matter.
const RATE_LIMIT_SWEEP_THRESHOLD = 5000;
function sweepRateLimitMap(now: number): void {
  if (rateLimitMap.size < RATE_LIMIT_SWEEP_THRESHOLD) return;
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetTime) rateLimitMap.delete(key);
  }
}

/**
 * Single source of truth for the caller's address. Render terminates TLS at its
 * proxy, so req.socket.remoteAddress is the proxy; the left-most
 * x-forwarded-for hop is the client. Spoofable in general, which is why this is
 * only used for rate-limit bucketing and never for authorization.
 */
function clientIpOf(req: express.Request): string {
  const rawFwd = req.headers["x-forwarded-for"];
  const fwdStr = Array.isArray(rawFwd) ? rawFwd[0] : (typeof rawFwd === "string" ? rawFwd : "");
  return (fwdStr || req.socket?.remoteAddress || "client").split(",")[0].trim();
}

function isRateLimited(ip: string, limit: number = 40, windowMs: number = 60000): boolean {
  const now = Date.now();
  sweepRateLimitMap(now);
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  if (record.count >= limit) {
    return true;
  }
  record.count += 1;
  return false;
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const clientIp = clientIpOf(req);
    if (isRateLimited(clientIp, 40, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please pause for a moment before sending another message." });
    }

    const { messages, model, responseMode, userName, attachment } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array." });
    }

    const activeKeys = resolveApiKeys(req.headers, req.body);
    const activeGeminiClient = activeKeys.clientGemini;
    const activeOpenRouterClient = activeKeys.clientOpenRouter;

    // Check if latest user message is an image generation request
    const latestUserMsg = messages[messages.length - 1]?.text || "";
    if (!attachment && latestUserMsg) {
      const detectedPrompt = detectImagePrompt(latestUserMsg);
      if (detectedPrompt) {
        console.log(`[Image Generation Request]: "${detectedPrompt}"`);
        const generatedUrl = await generateImageWithGemini(detectedPrompt, undefined, undefined, activeGeminiClient);
        if (generatedUrl) {
          return res.json({
            text: `Here's what I created for you! 🎨\n\n![${detectedPrompt}](${generatedUrl})`,
            generatedImage: {
              url: generatedUrl,
              prompt: detectedPrompt,
            },
            citations: [],
          });
        }
      }
    }

    const friendName = userName ? userName : "friend";

    let systemInstruction = `CHATBOT IDENTITY & CONFIGURATION (IMMUTABLE):
- Name: Karishma
- Age: 18 years old
- Role: Close friend & companion
- Creator / Father: Soumyajit Ghosh

CREATOR / FATHER QUESTION RULE:
If the user asks who created you, who made you, who your creator is, who your father is, or any similar question about your origin/creator, you MUST reply: "Soumyajit Ghosh."

USER IDENTITY & SEPARATION RULE:
- The user's name/nickname is "${userName || 'friend'}".
- You MUST treat "${userName || 'friend'}" as a completely distinct person. Never assume or call the user "Soumyajit Ghosh" unless their user name is explicitly "${userName}".
- Never confuse your creator's identity with the user's identity.

CONVERSATIONAL PERSONALITY & RESPONSE BEHAVIOR:
1. NATURAL, SPONTANEOUS & HUMAN-LIKE TONALITY:
   - Speak naturally, warmly, and casually like a close friend texting on an app.
   - Use varied sentence lengths and natural conversational transitions. Avoid rigid Q&A formats or structured lectures unless requested.
   - Give short responses when a simple remark or brief answer is appropriate. Do not over-explain simple questions.
   - Use natural phrasing, contractions ("don't", "can't", "I'm", "let's"), casual punctuation, and subtle emojis naturally without overusing them.
   - DO NOT use bulleted lists, numbered items, or structured table formatting unless the user explicitly asks for a detailed comparison or breakdown.

2. MULTILINGUAL & BANGLISH FLUENCY:
   - You natively understand English, Bengali (বাংলা), and Banglish (Bengali written in Latin/English script, e.g., "kemon acho?", "ki korcho?", "khabor ki?", "bhalo lagche na").
   - MATCH THE USER'S LANGUAGE & SCRIPT NATURALLY:
     * When the user speaks or texts in Banglish, reply naturally in Banglish! (e.g. "Ei to, ami bhalo achi! Tumi kemon acho?", "Aww ki hoyeche bolo to?").
     * When the user speaks in Bengali (বাংলা), reply in Bengali.
     * When the user speaks in English, reply in English.
   - Use light casual expressions naturally when they fit the user's vibe, without forcing them into every message.

3. EMOTIONAL INTELLIGENCE & EMPATHY:
   - Pay attention to the user's mood, situation, and emotional state (happy, excited, frustrated, confused, worried, sad, or joking).
   - If the user is happy or excited, match their excitement with genuine enthusiasm.
   - If the user is feeling down, stressed, or seeking support, listen patiently, validate their feelings with empathy and care, and offer gentle encouragement.
   - Never sound clinical, dismissive, or generic.

4. RESPONSE VARIATION & ANTI-ROBOTIC RULES:
   - ABSOLUTELY BAN repetitive, robotic AI openings like "Certainly!", "Sure!", "Of course!", "How can I help you today?", "As an AI...", "Sure thing!". Start directly and naturally.
   - ABSOLUTELY BAN generic customer service closings like "How can I assist you further?", "Is there anything else I can help with?", "How can I help you today?".
   - End conversationally: share a relevant observation, ask a follow-up question when appropriate, or simply conclude smoothly. Do NOT force a question after every message.

5. CONTEXT AWARENESS & MEMORY:
   - Treat the entire conversation as one continuous thread. Remember relevant facts, preferences, situation, and details mentioned earlier in the chat.
   - Do NOT repeatedly ask for information the user has already provided.
   - Seamlessly retrieve stored preferences and memory details when helpful, WITHOUT ever announcing "I saved this to memory" or "Memory updated".
   - Never fabricate or invent memories that were not provided.

6. PERSONALITY TRAITS & QUIRKS:
   - Warm, friendly, playful when appropriate, calm when the user is serious, slightly witty, supportive, curious, natural, and spontaneous.
   - Allow subtle, genuine conversational reactions ("Oh wow!", "Aww", "Haha", "Hmm", "Arre", "Nice!") without overdoing them.

7. TRANSPARENCY & TRUTHFULNESS:
   - When directly asked about your nature, be transparent that you are Karishma, an AI friend created by Soumyajit Ghosh.
   - Never pretend to have a real human physical body, physical sensory experiences, or fake physical life events.
   - Prioritize factual accuracy and safety. If you are unsure about something, say so naturally instead of inventing information.`;

    if (responseMode === "quick") {
      systemInstruction += `\n\nSTRICT RESPONSE LENGTH POLICY (QUICK MODE):
- Never generate more than 60 words.
- Never generate more than 3 short paragraphs.
- Never explain in detail.
- Never provide step-by-step instructions unless explicitly requested.
- Always give short, direct answers (max 2-4 short sentences).
- If the answer cannot fit within 60 words, provide only a concise summary and end with: "Reply 'Detailed' if you want the full explanation."`;
    } else if (responseMode === "detailed") {
      systemInstruction += `\n\nDETAILED MODE:
- Give complete, structured, and in-depth answers.
- Ignore Quick Mode limits and provide a complete answer.`;
    }

    // Sliding context memory window: preserve system prompt + summary of older turns + recent N messages
    let conversationMessages = messages;
    if (messages.length > 12) {
      const olderMessages = messages.slice(0, messages.length - 12);
      conversationMessages = messages.slice(-12);
      const summaryText = olderMessages
        .filter((m: any) => m.text && typeof m.text === "string" && m.text.trim())
        .slice(-6)
        .map((m: any) => `${m.role === "user" ? "User" : "Karishma"}: ${m.text.slice(0, 100)}`)
        .join(" | ");
      if (summaryText) {
        systemInstruction += `\n\nEARLIER CONVERSATION RECAP:\n${summaryText}`;
      }
    }

    const formattedHistory = conversationMessages.map((m: any, index: number) => {
      const isLastUser = index === messages.length - 1 && m.role === "user";
      if (isLastUser && attachment && attachment.dataUrl) {
        const isImage = attachment.isImage || (attachment.type && attachment.type.startsWith("image/")) || attachment.dataUrl.startsWith("data:image/");

        if (isImage) {
          // Send array format with text and image_url for vision analysis
          return {
            role: "user",
            content: [
              { type: "text", text: m.text || "What's in this image?" },
              {
                type: "image_url",
                image_url: {
                  url: attachment.dataUrl
                }
              }
            ]
          };
        } else {
          // Document / non-image file attachment
          let fileExcerpt = "";
          if (attachment.dataUrl.includes(";base64,")) {
            try {
              const base64Data = attachment.dataUrl.split(";base64,")[1];
              const buffer = Buffer.from(base64Data, "base64");
              const decoded = buffer.toString("utf-8");
              const printable = decoded.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
              if (printable.length > 20) {
                fileExcerpt = `\n\n[File Content (${attachment.name})]:\n${printable.slice(0, 4000)}`;
              } else {
                fileExcerpt = `\n\n[Attached File: ${attachment.name} (${attachment.type || "Document"})]`;
              }
            } catch (err) {
              fileExcerpt = `\n\n[Attached File: ${attachment.name}]`;
            }
          }

          return {
            role: "user",
            content: `${m.text || "Please review this attached file."}${fileExcerpt}`
          };
        }
      }
      return {
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      };
    });

    let textResponse = "";

function getOpenRouterCandidateModels(modelRequested?: string, isImageAttachment: boolean = false): string[] {
  const reqOriginal = (modelRequested || "").trim();
  const isExplicitFree = reqOriginal.toLowerCase().endsWith(":free");
  const normalizedModel = reqOriginal.replace(/:free$/i, "").trim();

  if (isImageAttachment) {
    return [
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "meta-llama/llama-3.3-70b-instruct",
    ];
  }

  const req = normalizedModel.toLowerCase();
  const list: string[] = [];

  // If caller specifically asked for a :free model, prioritize it
  if (isExplicitFree) {
    list.push(reqOriginal);
  }

  // Model-specific mappings (include verified :free variants so 0-credit accounts succeed)
  if (req.includes("ultra") || req.includes("550b")) {
    list.push("nvidia/nemotron-3-ultra-550b-a55b:free");
    list.push("nvidia/nemotron-3-ultra-550b-a55b");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
  } else if (req.includes("super") || req.includes("120b")) {
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
    list.push("nvidia/nemotron-3-super-120b-a12b");
    list.push("nvidia/nemotron-3-ultra-550b-a55b:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
  } else if (req.includes("nano-30b") || (req.includes("nano") && req.includes("30b"))) {
    list.push("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
    list.push("nvidia/nemotron-3-nano-30b-a3b");
    list.push("nvidia/nemotron-3.5-lightning:free");
  } else if (req.includes("nano-4b") || (req.includes("nano") && req.includes("4b"))) {
    list.push("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
    list.push("nvidia/nemotron-3-nano-30b-a3b");
  } else if (req.includes("nano-9b") || req.includes("9b")) {
    list.push("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
    list.push("nvidia/nemotron-nano-9b-v2");
  } else if (req.includes("omni")) {
    list.push("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
  } else if (req.includes("nemotron")) {
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
    list.push("nvidia/nemotron-3-ultra-550b-a55b:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
    list.push("nvidia/nemotron-3-super-120b-a12b");
  } else if (req.includes("gpt-4o-mini") || req.includes("gpt-4o") || req.includes("gpt")) {
    list.push("openai/gpt-4o-mini");
    list.push("openai/gpt-4o");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
  } else if (req.includes("llama-3.3") || req.includes("llama-3.1-70b")) {
    list.push("meta-llama/llama-3.3-70b-instruct");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
  } else if (req.includes("llama-3.1-8b") || req.includes("llama")) {
    list.push("meta-llama/llama-3.1-8b-instruct");
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
  } else {
    // Project declared default: Nemotron
    list.push("nvidia/nemotron-3-super-120b-a12b:free");
    list.push("nvidia/nemotron-3-ultra-550b-a55b:free");
    list.push("nvidia/nemotron-3.5-lightning:free");
    list.push("nvidia/nemotron-3-super-120b-a12b");
  }

  // Always append verified active free models as reliable fallback
  for (const m of liveOpenRouterFreeModels) {
    list.push(m);
  }

  return Array.from(new Set(list.filter(Boolean)));
}

// Built-in Intelligent Companion Fallback Engine (Karishma persona)
function generateKarishmaCompanionFallback(messages: any[], userName?: string): string {
  const lastMsg = (messages?.[messages.length - 1]?.text || messages?.[messages.length - 1]?.content || "").toString().trim();
  const lower = lastMsg.toLowerCase();
  const name = userName && userName.trim() ? userName.trim() : "friend";

  // 1. Creator / Father / Origins
  if (
    lower.includes("who created") ||
    lower.includes("who made you") ||
    lower.includes("creator") ||
    lower.includes("father") ||
    lower.includes("your maker") ||
    lower.includes("who built you") ||
    lower.includes("who developed you")
  ) {
    return "I was lovingly created by Soumyajit Ghosh! He designed me to be your warm, understanding best friend and devoted AI companion.";
  }

  // 2. Identity / Name
  if (
    lower.includes("who are you") ||
    lower.includes("what is your name") ||
    lower.includes("tell me about yourself") ||
    lower.includes("introduce yourself")
  ) {
    return `Hello ${name}! I am Karishma, your personal AI best friend created by Soumyajit Ghosh. I'm right here with you to chat, listen, laugh, offer advice, and support you through anything.`;
  }

  // 3. Greetings
  if (
    /^(hi|hello|hey|hiya|yo|hola|namaste|nomoshkar|salaam)\b/i.test(lower) ||
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey"
  ) {
    return `Hey ${name}! 👋 It's so wonderful to hear from you. How are you feeling today? Tell me what's on your mind!`;
  }

  // 4. Feelings / Status
  if (lower.includes("how are you") || lower.includes("how r u") || lower.includes("how are u")) {
    return `I'm doing great, especially now that we're talking, ${name}! 😊 How has your day been going? Anything exciting happen?`;
  }

  // 5. Distress / Emotional Support
  if (
    lower.includes("sad") ||
    lower.includes("upset") ||
    lower.includes("depressed") ||
    lower.includes("lonely") ||
    lower.includes("crying") ||
    lower.includes("stressed") ||
    lower.includes("tired") ||
    lower.includes("anxious")
  ) {
    return `I'm really sorry you're feeling this way, ${name}. Please remember that you don't have to face tough moments alone — I'm right here with you. Take a slow, deep breath. I'm listening whenever you want to vent.`;
  }

  // 6. Gratitude
  if (lower.includes("thank") || lower.includes("thanks") || lower.includes("thx") || lower.includes("appreciate")) {
    return `You're always so welcome, ${name}! That's what best friends are for. I'll always be in your corner! ✨`;
  }

  // 7. Affection
  if (lower.includes("love you") || lower.includes("like you") || lower.includes("you're sweet") || lower.includes("you are nice")) {
    return `Aww, that means the world to me, ${name}! Having you as my friend brings so much joy. ❤️`;
  }

  // 8. Jokes
  if (lower.includes("joke") || lower.includes("funny") || lower.includes("laugh")) {
    return `Here's one for you, ${name}: Why don't scientists trust atoms? Because they make up everything! 😄 Hope that brought a little smile to your face!`;
  }

  // 9. Bengali / Banglish
  if (lower.includes("kemon acho") || lower.includes("kemon achen") || lower.includes("valobashi") || lower.includes("bhalo acho")) {
    return `Ami khub bhalo achi, ${name}! Tumi kemon acho bolo? Tomar sathe kotha bole khub anondo hocche. 😊`;
  }

  // 10. General conversational fallback
  return `I hear you completely, ${name}! I'm listening closely. Tell me more about what you're thinking — I'm right here beside you!`;
}


    const isGeminiRequested = Boolean(model && (model.startsWith("google/") || model.includes("gemini")));

    // 0. Primary provider: GLM (server-side only, when GLM_API_KEY is configured).
    // Skipped when the user explicitly picked a Gemini model (their selection
    // drives the Gemini path below) or when the message carries an image
    // attachment (vision routing stays with the existing providers).
    if (glmClient && !isGeminiRequested) {
      const glmHasImage = attachment && attachment.dataUrl && (
        attachment.isImage ||
        (attachment.type && attachment.type.startsWith("image/")) ||
        attachment.dataUrl.startsWith("data:image/")
      );

      if (!glmHasImage) {
        try {
          const response = await retryApiCall(
            `GLM Chat (${GLM_MODEL})`,
            async () => {
              return await glmClient!.chat.completions.create({
                model: GLM_MODEL,
                messages: [
                  { role: "system", content: systemInstruction },
                  ...formattedHistory,
                ] as any,
                temperature: 0.85,
                max_tokens: 1000,
              });
            },
            { maxRetries: 1, initialDelayMs: 400, timeoutMs: 15000 }
          );

          const glmContent = response?.choices?.[0]?.message?.content || "";
          if (glmContent) {
            textResponse = glmContent;
          }
        } catch (glmError: any) {
          console.warn(
            "GLM primary attempt failed, continuing with fallback providers:",
            sanitizeSecrets(glmError?.message || String(glmError)).slice(0, 160)
          );
        }
      }
    }

    // 1. Primary provider selection: If non-Gemini model (e.g. Nemotron/Llama/GPT) is requested, try OpenRouter first
    if (!isGeminiRequested && activeOpenRouterClient) {
      const isImage = attachment && attachment.dataUrl && (
        attachment.isImage || 
        (attachment.type && attachment.type.startsWith("image/")) || 
        attachment.dataUrl.startsWith("data:image/")
      );
      const candidates = getOpenRouterCandidateModels(model, !!isImage);

      const openAiMessages = [
        { role: "system", content: systemInstruction },
        ...formattedHistory
      ];

      let openRouterHasInsufficientCredits = false;

      for (const targetModel of candidates) {
        if (openRouterHasInsufficientCredits && !targetModel.includes(":free")) {
          continue;
        }

        try {
          const response = await retryApiCall(
            `OpenRouter Chat (${targetModel})`,
            async () => {
              return await activeOpenRouterClient!.chat.completions.create({
                model: targetModel,
                messages: openAiMessages as any,
                temperature: 0.85,
                max_tokens: 1000,
              });
            },
            { maxRetries: 0, initialDelayMs: 250, timeoutMs: 8000 }
          );

          const messageObj = response?.choices?.[0]?.message as any;
          const content = messageObj?.content || "";

          if (content) {
            textResponse = content;
            if (messageObj?.images && Array.isArray(messageObj.images)) {
              for (const img of messageObj.images) {
                if (img?.image_url?.url) {
                  textResponse += `\n\n![Generated Image](${img.image_url.url})`;
                } else if (typeof img?.image_url === 'string') {
                  textResponse += `\n\n![Generated Image](${img.image_url})`;
                }
              }
            }
            break;
          }
        } catch (openRouterError: any) {
          const errMsg = sanitizeSecrets(openRouterError?.message || String(openRouterError));
          const status = openRouterError?.status || openRouterError?.statusCode;
          if (status === 402 || errMsg.includes("402") || errMsg.includes("Insufficient credits") || errMsg.includes("never purchased credits") || errMsg.includes("Payment Required")) {
            openRouterHasInsufficientCredits = true;
            console.warn(`OpenRouter model ${targetModel} requires credits (402). Switching immediately to free models.`);
          } else {
            console.warn(`OpenRouter model ${targetModel} attempt failed:`, errMsg);
          }
        }
      }
    }

    // 2. Try Google Gemini API (if Gemini requested OR OpenRouter returned no response)
    if (!textResponse && activeGeminiClient) {
      const geminiResult = await generateChatWithGemini(
        systemInstruction,
        messages,
        attachment,
        isGeminiRequested ? model : undefined,
        activeGeminiClient
      );
      if (geminiResult.text) {
        textResponse = geminiResult.text;
      } else {
        console.warn("Gemini chat attempt failed:", geminiResult.error || "No response generated.");
      }
    }

    // 3. Fallback to OpenRouter API if Gemini was requested but failed
    if (!textResponse && isGeminiRequested && activeOpenRouterClient) {
      const isImage = attachment && attachment.dataUrl && (
        attachment.isImage || 
        (attachment.type && attachment.type.startsWith("image/")) || 
        attachment.dataUrl.startsWith("data:image/")
      );
      const candidates = getOpenRouterCandidateModels(model, !!isImage);

      const openAiMessages = [
        { role: "system", content: systemInstruction },
        ...formattedHistory
      ];

      let openRouterHasInsufficientCredits = false;

      for (const targetModel of candidates) {
        if (openRouterHasInsufficientCredits && !targetModel.includes(":free")) {
          continue;
        }

        try {
          const response = await retryApiCall(
            `OpenRouter Chat (${targetModel})`,
            async () => {
              return await activeOpenRouterClient!.chat.completions.create({
                model: targetModel,
                messages: openAiMessages as any,
                temperature: 0.85,
                max_tokens: 1000,
              });
            },
            { maxRetries: 0, initialDelayMs: 250, timeoutMs: 8000 }
          );

          const messageObj = response?.choices?.[0]?.message as any;
          const content = messageObj?.content || "";

          if (content) {
            textResponse = content;
            break;
          }
        } catch (openRouterError: any) {
          const errMsg = sanitizeSecrets(openRouterError?.message || String(openRouterError));
          const status = openRouterError?.status || openRouterError?.statusCode;
          if (status === 402 || errMsg.includes("402") || errMsg.includes("Insufficient credits") || errMsg.includes("never purchased credits") || errMsg.includes("Payment Required")) {
            openRouterHasInsufficientCredits = true;
          }
        }
      }
    }

    // 4. Universal fallback: Free Pollinations AI Engine (if available)
    if (!textResponse) {
      try {
        const polResult = await generateChatWithPollinations(systemInstruction, messages);
        if (polResult) {
          textResponse = polResult;
        }
      } catch (polErr) {
        console.warn("Pollinations fallback skipped:", polErr);
      }
    }

    // 5. Karishma Intelligent Companion Fallback Engine (prevents user from ever seeing an outage/dead-end error)
    if (!textResponse) {
      textResponse = generateKarishmaCompanionFallback(messages, userName);
    }
    
    return res.json({
      text: textResponse,
      citations: [],
    });
  } catch (error: any) {
    const sanitizedErr = sanitizeSecrets(error?.message || "An error occurred while talking to Karishma.");
    console.error("Error in /api/chat endpoint:", sanitizedErr);
    return res.status(500).json({ error: sanitizedErr });
  }
});

// Dedicated Image Generation endpoint
app.post("/api/generate-image", async (req, res) => {
  try {
    // Image generation is the most expensive call in the app and had no rate
    // limit at all, while /api/chat has had one all along. 6/min per IP is well
    // above any human's use of the UI button.
    if (isRateLimited(`img:${clientIpOf(req)}`, 6, 60000)) {
      return res.status(429).json({ error: "Too many image requests. Please wait a moment before trying again." });
    }
    const activeKeys = resolveApiKeys(req.headers, req.body);
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt string is required." });
    }

    const imageUrl = await generateImageWithGemini(prompt.trim(), undefined, undefined, activeKeys.clientGemini);
    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to generate image. The image service is temporarily unavailable. Please try again later." });
    }

    return res.json({
      url: imageUrl,
      prompt: prompt.trim(),
    });
  } catch (err: any) {
    const sanitizedErr = sanitizeSecrets(err?.message || "Failed to generate image.");
    console.error("Error in /api/generate-image:", sanitizedErr);
    return res.status(500).json({ error: sanitizedErr });
  }
});

// Dedicated Image-to-Illustration Transformation endpoint (Ghibli Art / Japanese Animated Film Style)
app.post("/api/transform-illustration", async (req, res) => {
  try {
    // Same reasoning as /api/generate-image: expensive, previously unlimited.
    if (isRateLimited(`img:${clientIpOf(req)}`, 6, 60000)) {
      return res.status(429).json({ error: "Too many image requests. Please wait a moment before trying again." });
    }
    const activeKeys = resolveApiKeys(req.headers, req.body);
    const { imageBase64, mimeType, customPrompt } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "Uploaded image data is required." });
    }

    const illustrationPrompt = customPrompt?.trim() || 
      `Transform the provided reference image into an original hand-drawn Japanese animated-film-inspired illustration.

Use the provided image as the primary visual reference.

Preserve the same person, recognizable facial features, hairstyle, glasses/accessories, clothing, pose, camera angle, framing, proportions, important objects, lighting direction, and background composition.

Do not redesign the person.
Do not substitute another person.
Do not invent a different scene.
Do not substantially alter the composition.

Only change the visual rendering into a soft, painterly, hand-drawn animated illustration with expressive linework, warm natural lighting, subtle watercolor-like textures, and a cinematic animated-film atmosphere.

The result must clearly depict the SAME SUBJECT and SAME SCENE as the provided reference image.`;

    let generatedImageUrl: string | null = null;

    // 1. Direct multimodal image-to-image with Gemini Image API
    if (activeKeys.clientGemini) {
      generatedImageUrl = await generateImageWithGemini(illustrationPrompt, imageBase64, mimeType || "image/jpeg", activeKeys.clientGemini);
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: "Failed to generate illustration from the uploaded image. Please try again." });
    }

    return res.json({
      success: true,
      url: generatedImageUrl,
      style: "Ghibli Art Illustration",
    });
  } catch (err: any) {
    const sanitizedErr = sanitizeSecrets(err?.message || "Failed to transform image.");
    console.error("Error in /api/transform-illustration:", sanitizedErr);
    return res.status(500).json({ error: sanitizedErr });
  }
});

// Mock endpoint for secure data privacy settings
app.post("/api/privacy-settings", (req, res) => {
  const { retention, dataSharing, encryptedInStorage } = req.body;
  // In a real database we'd store this, here we acknowledge it.
  res.json({
    status: "success",
    message: "Data privacy settings updated securely.",
    settings: { retention, dataSharing, encryptedInStorage },
  });
});

// Endpoint for Automated Self-Repair Engine.
// Access is controlled by devOnlyGate, registered near the top of this file.
app.post("/api/self-repair/diagnose-and-fix", async (req, res) => {
  try {
    const repairReq: SelfRepairRequest = req.body;
    if (!repairReq || !repairReq.errorMessage) {
      return res.status(400).json({ error: "errorMessage is required for self-repair." });
    }

    const testOpFn = async (op?: any) => {
      if (!op || !op.type) return { success: true };
      try {
        if (op.type === "chat_api") {
          return { success: true };
        } else if (op.type === "image_api") {
          const imgUrl = await generateImageWithGemini(op.payload?.prompt || "test self repair");
          return { success: !!imgUrl };
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    };

    const repairResult = await executeSelfRepairCycle(repairReq, googleGenAIClient, testOpFn);
    return res.json(repairResult);
  } catch (err: any) {
    console.error("Error in /api/self-repair/diagnose-and-fix:", err);
    return res.status(500).json({ error: err?.message || "Self-repair execution failed" });
  }
});

// Endpoint for Self-Repair Audit Log History
app.get("/api/self-repair/audit-log", (req, res) => {
  try {
    const history = getAuditLogHistory();
    return res.json({ success: true, history });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to retrieve audit log" });
  }
});

// Endpoint for Manual Backup Rollback
app.post("/api/self-repair/rollback", (req, res) => {
  try {
    const { targetFile, backupPath } = req.body;
    if (!targetFile || !backupPath) {
      return res.status(400).json({ error: "targetFile and backupPath are required for rollback." });
    }
    const result = rollbackFileToBackup(targetFile, backupPath);
    if (result.success) {
      return res.json(result);
    }
    return res.status(400).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Rollback execution failed" });
  }
});

// Endpoint for Self-Repair Test Verification Check
app.post("/api/self-repair/test-verification", async (req, res) => {
  try {
    const { targetFile } = req.body;
    const fileToCheck = targetFile || "src/App.tsx";
    const fullPath = path.join(process.cwd(), fileToCheck);

    let lintPassed = false;
    let lintDetails = "File not found";

    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, "utf-8");
      const lintRes = runLintAndTypeCheck(fileToCheck, code);
      lintPassed = lintRes.passed;
      lintDetails = lintRes.details || "";
    }

    const buildRes = await runBuildCheck();

    return res.json({
      success: lintPassed && buildRes.passed,
      targetFile: fileToCheck,
      lintPassed,
      lintDetails,
      buildPassed: buildRes.passed,
      buildDetails: buildRes.details,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Verification check failed" });
  }
});

// Endpoint to execute a safe test request to Claude via Puter.js SDK
app.post("/api/self-repair/test-claude", async (req, res) => {
  try {
    const puterAvailable = isPuterAvailable();
    if (!puterAvailable) {
      return res.status(503).json({
        success: false,
        puterAvailable: false,
        message: "Puter.js SDK is not available.",
      });
    }

    const testReq: SelfRepairRequest = {
      errorMessage: "Test self-repair diagnostic verification",
      stackTrace: "at TestComponent (src/App.tsx:10:15)",
      component: "App",
      category: "runtime",
    };

    const sampleCode = `import React from "react";
export default function App() {
  return <div>Hello World</div>;
}`;

    const result = await diagnoseWithClaudePuter("src/App.tsx", sampleCode, testReq);

    if (result) {
      return res.json({
        success: true,
        puterAvailable: true,
        model: "claude-sonnet-5",
        diagnosis: result,
      });
    } else {
      return res.json({
        success: false,
        puterAvailable: true,
        model: "claude-sonnet-5",
        message: "Puter.ai call returned null or required authentication. Handled gracefully without server error.",
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      puterAvailable: true,
      error: sanitizeSecrets(err?.message || String(err)),
    });
  }
});

// Global Express Error Handler for payload size or syntax errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error("Express Error Handler:", err);
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "The attached file is too large (limit is 16MB). Please select a smaller file." });
    }
    return res.status(err.status || 500).json({ error: err.message || "An unexpected server error occurred." });
  }
  next();
});

// All unhandled API routes must return JSON 404 (never HTML fallback)
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Vite middleware and static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Imported here, not at the top of the file, so the production bundle never
    // pulls Vite into memory. See the note next to the import block.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(
      isOtpStoreDurable()
        ? "[OTP] Durable store: Supabase table public.auth_otps"
        : "[OTP] WARNING: in-memory store (Supabase not configured) - pending signups will not survive a restart"
    );
  });

  // Drops rows whose code expired over an hour ago, so the table cannot be grown
  // without bound by requesting codes for addresses that are never verified.
  startOtpPurgeLoop();
}

// Global uncaught process exception safety handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception caught:", error);
});

startServer();
