import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  hasSupabaseCredentials,
  readSupabaseCredentials,
  warnIfNotServiceRoleKey,
} from "./supabaseKey";

export interface PersistedChatMessage {
  id?: string;
  role: string;
  text: string;
  timestamp?: string;
  isEncrypted?: boolean;
  citations?: unknown;
}

export interface PersistedChatSession {
  id: string;
  userId: string;
  title?: string;
  timestamp?: string;
  mode?: string;
  updatedAt?: string;
  messages?: PersistedChatMessage[];
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  // Publishable/anon keys are deliberately not accepted: users, conversations
  // and messages are all service-role-only under RLS, so an anon key made this
  // return true while every query failed. See server/supabaseKey.ts.
  return hasSupabaseCredentials();
}

function getClient(): SupabaseClient {
  if (client) return client;

  const { url, key: serviceRoleKey } = readSupabaseCredentials();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  warnIfNotServiceRoleKey(serviceRoleKey, "supabaseHistory");
  return client;
}

function normalizeRole(role?: string): "user" | "assistant" | "system" | "model" {
  const r = (role || "").toLowerCase().trim();
  if (r === "user") return "user";
  if (r === "system") return "system";
  if (r === "model") return "model";
  return "assistant";
}

function toTimestamp(value?: string): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function titleFor(session: PersistedChatSession, existingTitle?: string): string {
  if (session.title && session.title !== "New Conversation" && session.title.trim()) {
    return session.title.trim();
  }
  const firstUserMessage = session.messages?.find((message) => message?.role === "user" && message.text)?.text?.trim();
  if (firstUserMessage) {
    return firstUserMessage.slice(0, 40) + (firstUserMessage.length > 40 ? "..." : "");
  }
  return existingTitle && existingTitle !== "New Conversation" ? existingTitle : "Chat";
}

// Resilient in-memory session store (used when Supabase tables are not yet created in remote DB)
const memorySessions = new Map<string, Map<string, PersistedChatSession>>();
let warnedSchemaCache = false;

function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code || "";
  return (
    code === "PGRST205" ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("relation \"public.conversations\" does not exist") ||
    msg.includes("relation \"conversations\" does not exist") ||
    msg.includes("relation \"public.messages\" does not exist") ||
    msg.includes("relation \"messages\" does not exist")
  );
}

export async function getConversationHistory(userId: string): Promise<PersistedChatSession[]> {
  const userMap = memorySessions.get(userId);
  const localList = userMap ? Array.from(userMap.values()) : [];

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const supabase = getClient();
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, user_id, title, started_at, mode, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (conversationsError) {
      if (isSchemaCacheError(conversationsError)) {
        if (!warnedSchemaCache) {
          warnedSchemaCache = true;
          console.warn(
            "[supabaseHistory] Table 'public.conversations' not found in schema cache. " +
            "Please run 'supabase/schema.sql' in your Supabase SQL Editor. " +
            "Using in-memory session store in the meantime."
          );
        }
        return localList;
      }
      throw new Error(`Supabase history query failed: ${conversationsError.message}`);
    }

    if (!conversations?.length) return localList;

    const conversationIds = conversations.map((conversation: any) => conversation.id);
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, client_timestamp, is_encrypted, citations, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (messagesError && !isSchemaCacheError(messagesError)) {
      throw new Error(`Supabase message query failed: ${messagesError.message}`);
    }

    const messagesByConversation = new Map<string, PersistedChatMessage[]>();
    for (const message of messages || []) {
      const list = messagesByConversation.get(message.conversation_id) || [];
      list.push({
        id: message.id,
        role: message.role,
        text: message.content,
        timestamp: message.client_timestamp || message.created_at,
        isEncrypted: message.is_encrypted,
        citations: message.citations || undefined,
      });
      messagesByConversation.set(message.conversation_id, list);
    }

    const remoteSessions = conversations.map((conversation: any) => ({
      id: conversation.id,
      userId: conversation.user_id,
      title: conversation.title,
      timestamp: conversation.started_at || conversation.created_at,
      mode: conversation.mode || "default",
      updatedAt: conversation.updated_at,
      messages: messagesByConversation.get(conversation.id) || [],
    }));

    // Merge remote with local memory (remote taking precedence)
    const combined = new Map<string, PersistedChatSession>();
    for (const s of localList) combined.set(s.id, s);
    for (const s of remoteSessions) combined.set(s.id, s);
    return Array.from(combined.values());
  } catch (err: any) {
    if (isSchemaCacheError(err)) {
      return localList;
    }
    throw err;
  }
}

export async function saveConversation(userId: string, session: PersistedChatSession): Promise<void> {
  // Always update in-memory fallback first
  let userMap = memorySessions.get(userId);
  if (!userMap) {
    userMap = new Map();
    memorySessions.set(userId, userMap);
  }
  userMap.set(session.id, { ...session, userId });

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = getClient();
    const { data: existing, error: existingError } = await supabase
      .from("conversations")
      .select("user_id, title")
      .eq("id", session.id)
      .maybeSingle();

    if (existingError) {
      if (isSchemaCacheError(existingError)) {
        if (!warnedSchemaCache) {
          warnedSchemaCache = true;
          console.warn(
            "[supabaseHistory] Table 'public.conversations' not found in schema cache. " +
            "Please run 'supabase/schema.sql' in your Supabase SQL Editor. " +
            "Using in-memory session store in the meantime."
          );
        }
        return; // Saved in memory
      }
      throw new Error(`Supabase conversation lookup failed: ${existingError.message}`);
    }

    if (existing && existing.user_id !== userId) throw new Error("Forbidden: Not your session");

    const now = new Date().toISOString();
    const conversation = {
      id: session.id,
      user_id: userId,
      title: titleFor(session, existing?.title),
      mode: session.mode || "default",
      updated_at: now,
      ...(toTimestamp(session.timestamp) ? { started_at: toTimestamp(session.timestamp) } : {}),
    };
    const { error: conversationError } = await supabase
      .from("conversations")
      .upsert(conversation, { onConflict: "id" });

    if (conversationError) {
      if (isSchemaCacheError(conversationError)) {
        return; // Saved in memory
      }
      throw new Error(`Supabase conversation save failed: ${conversationError.message}`);
    }

    const messages = (session.messages || [])
      .filter((message) => message?.text)
      .map((message) => ({
        id: message.id || randomUUID(),
        conversation_id: session.id,
        role: normalizeRole(message.role),
        content: message.text,
        client_timestamp: message.timestamp || null,
        is_encrypted: Boolean(message.isEncrypted),
        citations: message.citations || null,
      }));

    if (messages.length) {
      const { error: messagesError } = await supabase
        .from("messages")
        .upsert(messages, { onConflict: "conversation_id,id" });
      if (messagesError && !isSchemaCacheError(messagesError)) {
        throw new Error(`Supabase message save failed: ${messagesError.message}`);
      }
    }
  } catch (err: any) {
    if (isSchemaCacheError(err)) {
      return; // Saved in memory
    }
    throw err;
  }
}

export async function deleteConversation(userId: string, sessionId: string): Promise<boolean> {
  const userMap = memorySessions.get(userId);
  let memoryDeleted = false;
  if (userMap) {
    memoryDeleted = userMap.delete(sessionId);
  }

  if (!isSupabaseConfigured()) {
    return memoryDeleted;
  }

  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      if (isSchemaCacheError(error)) {
        return memoryDeleted || true;
      }
      throw new Error(`Supabase conversation delete failed: ${error.message}`);
    }
    return Boolean(data?.length) || memoryDeleted;
  } catch (err: any) {
    if (isSchemaCacheError(err)) {
      return memoryDeleted || true;
    }
    throw err;
  }
}


export interface PersistedUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  sessionTokens?: string[];
}

export async function findUserByEmailSupabase(emailRaw: string): Promise<PersistedUser | null> {
  if (!isSupabaseConfigured() || !emailRaw) return null;
  try {
    const supabase = getClient();
    const cleanEmail = emailRaw.trim().toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      password: data.password || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      sessionTokens: Array.isArray(data.session_tokens) ? data.session_tokens : [],
    };
  } catch (err) {
    console.warn("Supabase findUserByEmail error:", err);
    return null;
  }
}

export async function upsertUserSupabase(user: PersistedUser): Promise<void> {
  if (!isSupabaseConfigured() || !user || !user.email) return;
  try {
    const supabase = getClient();
    const row = {
      id: user.id || randomUUID(),
      email: user.email.trim().toLowerCase(),
      name: user.name,
      password: user.password || null,
      session_tokens: user.sessionTokens || [],
      updated_at: new Date().toISOString(),
    };
    await supabase.from("users").upsert(row, { onConflict: "email" });
  } catch (err) {
    console.warn("Supabase upsertUser error:", err);
  }
}
