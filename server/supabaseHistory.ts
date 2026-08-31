import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
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

export async function getConversationHistory(userId: string): Promise<PersistedChatSession[]> {
  const supabase = getClient();
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, user_id, title, started_at, mode, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (conversationsError) throw new Error(`Supabase history query failed: ${conversationsError.message}`);
  if (!conversations?.length) return [];

  const conversationIds = conversations.map((conversation: any) => conversation.id);
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, client_timestamp, is_encrypted, citations, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw new Error(`Supabase message query failed: ${messagesError.message}`);

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

  return conversations.map((conversation: any) => ({
    id: conversation.id,
    userId: conversation.user_id,
    title: conversation.title,
    timestamp: conversation.started_at || conversation.created_at,
    mode: conversation.mode || "default",
    updatedAt: conversation.updated_at,
    messages: messagesByConversation.get(conversation.id) || [],
  }));
}

export async function saveConversation(userId: string, session: PersistedChatSession): Promise<void> {
  const supabase = getClient();
  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("user_id, title")
    .eq("id", session.id)
    .maybeSingle();

  if (existingError) throw new Error(`Supabase conversation lookup failed: ${existingError.message}`);
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
  if (conversationError) throw new Error(`Supabase conversation save failed: ${conversationError.message}`);

  const messages = (session.messages || [])
    .filter((message) => message?.text)
    .map((message) => ({
      id: message.id || randomUUID(),
      conversation_id: session.id,
      role: message.role || "user",
      content: message.text,
      client_timestamp: message.timestamp || null,
      is_encrypted: Boolean(message.isEncrypted),
      citations: message.citations || null,
    }));

  if (messages.length) {
    const { error: messagesError } = await supabase
      .from("messages")
      .upsert(messages, { onConflict: "conversation_id,id" });
    if (messagesError) throw new Error(`Supabase message save failed: ${messagesError.message}`);
  }
}

export async function deleteConversation(userId: string, sessionId: string): Promise<boolean> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");

  if (error) throw new Error(`Supabase conversation delete failed: ${error.message}`);
  return Boolean(data?.length);
}
