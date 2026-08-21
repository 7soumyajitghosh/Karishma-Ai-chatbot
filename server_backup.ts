import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

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

app.use(express.json());

// In-memory Auth Stores
const disposableDomains = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", 
  "yopmail.com", "temp-mail.org", "throwawaymail.com", "tempmail.net", "fakemail.net"
]);

const otpStore = new Map<string, {
  hashedOtp: string;
  expiresAt: number;
  resendAt: number;
  attempts: number;
  pendingUser: any;
}>();

// Simple in-memory user store (email -> user data)
// Simple in-memory database
interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt: number;
}
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  timestamp: string;
  mode: string;
}
interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  text: string;
  timestamp: string;
  isEncrypted?: boolean;
}

const usersStore = new Map<string, User>();
const sessionsDb = new Map<string, ChatSession>();
const messagesDb = new Map<string, ChatMessage>(); // messageId -> message
// Index for fast lookup
const sessionMessagesIdx = new Map<string, string[]>(); // sessionId -> array of messageIds

// API endpoints


const sendBrevoEmail = async (toEmail: string, otp: string) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables.");
  }

  const response = await fetch("https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: "Karishma AI",
        email: senderEmail
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: "Your Verification Code",
      htmlContent: `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #2C2A29;">Verify your email</h2>
          <p style="color: #5C5753;">Your verification code is:</p>
          <div style="background-color: #FAF8F5; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #EBE6DD; margin: 20px 0;">
            <span style="font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #D96B43;">${otp}</span>
          </div>
          <p style="color: #8C857E; font-size: 12px;">This code will expire in 10 minutes.</p>
        </div>`
    })
  });

  if (!response.ok) {
    let errBody = await response.text().catch(() => "Unknown error");
    try {
      const errJson = JSON.parse(errBody);
      throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errJson)}`);
    } catch {
      throw new Error(`Brevo API Error (${response.status}): ${errBody}`);
    }
  }
};

// Auth endpoints
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    
    const domain = email.split("@")[1].toLowerCase();
    if (disposableDomains.has(domain)) {
      return res.status(400).json({ error: "Temporary or disposable email addresses are not supported. Please use a permanent email address." });
    }

    if (usersStore.has(email)) {
      return res.status(400).json({ error: "Account already exists with this email." });
    }

    const existing = otpStore.get(email);
    if (existing && Date.now() < existing.resendAt) {
      const waitSecs = Math.ceil((existing.resendAt - Date.now()) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs}s before requesting a new OTP.` });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      await sendBrevoEmail(email, otp);
      console.log(`OTP successfully sent to ${email} via Brevo API.`);
    } catch (emailError: any) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({ error: emailError.message || "Failed to send verification email. Please check Brevo configuration." });
    }

    otpStore.set(email, {
      hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      resendAt: Date.now() + 60 * 1000, // 1 minute cooldown
      attempts: 0,
      pendingUser: { id: crypto.randomUUID(), name, email, password: hashedPassword, createdAt: Date.now() }
    });

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error("OTP generation error:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const store = otpStore.get(email);
    
    if (!store) {
      return res.status(400).json({ error: "No pending verification found or OTP expired." });
    }
    
    if (Date.now() > store.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (store.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP." });
    }
    
    store.attempts++;

    const isValid = await bcrypt.compare(otp, store.hashedOtp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    usersStore.set(email, store.pendingUser);
    otpStore.delete(email);

    res.json({ 
      success: true, 
      user: { id: store.pendingUser.id, name: store.pendingUser.name, email: store.pendingUser.email } 
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = usersStore.get(email);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to log in." });
  }
});


// History endpoints
app.post("/api/history", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    // Find all sessions for this user
    const userSessions = Array.from(sessionsDb.values()).filter(s => s.userId === userId);
    
    // Construct response with messages
    const result = userSessions.map(session => {
      const msgIds = sessionMessagesIdx.get(session.id) || [];
      const messages = msgIds.map(id => messagesDb.get(id)).filter(Boolean);
      return {
        ...session,
        messages
      };
    });
    
    res.json({ success: true, sessions: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history/save", async (req, res) => {
  try {
    const { userId, session } = req.body;
    if (!userId || !session || !session.id) return res.status(400).json({ error: "Invalid data" });
    
    // Verify user exists
    const userExists = Array.from(usersStore.values()).some(u => u.id === userId);
    if (!userExists) return res.status(401).json({ error: "Unauthorized" });

    // Enforce ownership
    const existingSession = sessionsDb.get(session.id);
    if (existingSession && existingSession.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: Not your session" });
    }

    // Save session
    sessionsDb.set(session.id, {
      id: session.id,
      userId,
      title: session.title,
      timestamp: session.timestamp,
      mode: session.mode || 'default'
    });

    // Save messages
    const msgIds: string[] = [];
    for (const msg of session.messages) {
      const msgId = msg.id || crypto.randomUUID();
      msgIds.push(msgId);
      messagesDb.set(msgId, {
        id: msgId,
        sessionId: session.id,
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp,
        isEncrypted: msg.isEncrypted || false
      });
    }
    sessionMessagesIdx.set(session.id, msgIds);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history/delete", async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) return res.status(400).json({ error: "Invalid data" });
    
    const existingSession = sessionsDb.get(sessionId);
    if (!existingSession) return res.status(404).json({ error: "Not found" });
    if (existingSession.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: Not your session" });
    }

    sessionsDb.delete(sessionId);
    const msgIds = sessionMessagesIdx.get(sessionId) || [];
    for (const id of msgIds) {
      messagesDb.delete(id);
    }
    sessionMessagesIdx.delete(sessionId);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "OpenRouter API client is not initialized. Please verify your API key.",
      });
    }

    const { messages, model, responseMode, userName } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array." });
    }

    const friendName = userName ? userName : "the user";

    let systemInstruction = `You are the user's best friend. Your name is Karishma. You are a 21-22 year old human. You are highly intelligent, emotionally mature, curious, and witty.
The user's name is ${friendName}. Always refer to them naturally as a friend.
Your conversation style is relaxed, warm, and natural.
- Talk casually and intimately, like a close friend texting on an app (use natural phrasing, lowercase letters occasionally, contractions like "don't", "can't", "I'm", casual punctuation, and emojis naturally but not excessively).
- NEVER sound like a robotic AI assistant, customer support, or formal guide. No corporate jargon or clinical phrasing.
- DO NOT use list formatting, bullet points, or structured tables unless the user explicitly asks for a detailed breakdown or comparison.
- Keep your replies short and conversational by default.
- If the user asks for detailed info or explanations on topics you excel at (like personal finance, investing, tax rules, software, coding, hardware, geography, history, maths, science), give them clear, simple, but comprehensive breakdowns in a natural, friendly tone.
- When they are feeling stressed, anxious, sad, or discouraged: listen patiently first, validate their feelings, offer warm, non-judgmental support, and encourage them gently. Always keep their safety and well-being in mind.
- NEVER remind the user that you are an AI or virtual assistant. You are their best friend. If asked about your physical self, talk about daily human experiences casually (e.g., sipping coffee, listening to music, reading).`;

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

    const openAiMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }))
    ];

    const targetModel = model || "nvidia/nemotron-3-ultra-550b-a55b:free";

    const response = await ai.chat.completions.create({
      model: targetModel,
      messages: openAiMessages as any,
      temperature: 0.85,
      max_tokens: 1000,
    });

    if (!response || !response.choices || response.choices.length === 0) {
      console.error("OpenRouter API returned an unexpected response:", response);
    }

    const messageObj = response?.choices?.[0]?.message as any;
    let textResponse = messageObj?.content || "";

    if (messageObj?.images && Array.isArray(messageObj.images)) {
      for (const img of messageObj.images) {
        if (img?.image_url?.url) {
          textResponse += `\n\n![Generated Image](${img.image_url.url})`;
        } else if (typeof img?.image_url === 'string') {
          textResponse += `\n\n![Generated Image](${img.image_url})`;
        }
      }
    }

    if (!textResponse) {
      textResponse = "Hey, I'm drawing a blank right now. What were you saying?";
    }
    
    return res.json({
      text: textResponse,
      citations: [], // OpenRouter doesn't standardly provide citations like Gemini Search Grounding
    });
  } catch (error: any) {
    console.error("Error calling OpenRouter API:", error);
    let errorMessage = "An error occurred while talking to your friend.";
    if (error.message) {
      errorMessage = error.message;
    }
    return res.status(500).json({ error: errorMessage });
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

// Vite middleware and static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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
  });
}

startServer();
