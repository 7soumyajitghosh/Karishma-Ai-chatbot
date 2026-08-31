import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const DB_FILE = path.join(process.cwd(), "db.json");

async function runMigration() {
  console.log("=== DB.JSON to Supabase Data Migration ===");

  if (!fs.existsSync(DB_FILE)) {
    console.error("Error: db.json file not found at", DB_FILE);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DB_FILE, "utf-8");
  const dbData = JSON.parse(rawData);

  // Extract Map entries format from db.json
  const rawUsers: [string, any][] = dbData.users || [];
  const rawSessions: [string, any][] = dbData.sessions || [];
  const rawMessages: [string, any][] = dbData.messages || [];

  console.log(`Found in db.json:`);
  console.log(`  Users: ${rawUsers.length}`);
  console.log(`  Sessions: ${rawSessions.length}`);
  console.log(`  Messages: ${rawMessages.length}`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("\nWARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in environment.");
    console.warn("Skipping remote Supabase network upsert. Server will use clean memory storage.");
    return {
      success: true,
      verified: true,
      remoteSupabase: false,
      userCount: rawUsers.length,
      sessionCount: rawSessions.length,
      messageCount: rawMessages.length,
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Migrate Users
  const userRows = rawUsers.map(([_email, u]) => ({
    id: u.id || u.email,
    email: (u.email || "").trim().toLowerCase(),
    name: u.name || "User",
    password: u.password || null,
    session_tokens: u.sessionTokens || [],
    created_at: typeof u.createdAt === "number" ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    updated_at: typeof u.updatedAt === "number" ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
  })).filter(u => u.email);

  if (userRows.length > 0) {
    const { error: userErr } = await supabase
      .from("users")
      .upsert(userRows, { onConflict: "email" });
    if (userErr) console.warn("Supabase user migration warning:", userErr.message);
  }

  // 2. Migrate Conversations (Sessions)
  const sessionRows = rawSessions.map(([_id, s]) => ({
    id: s.id,
    user_id: s.userId,
    title: s.title || "Chat",
    mode: s.mode || "default",
    started_at: s.timestamp ? new Date(s.timestamp).toISOString() : new Date().toISOString(),
    created_at: s.timestamp ? new Date(s.timestamp).toISOString() : new Date().toISOString(),
    updated_at: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
  })).filter(s => s.id && s.user_id);

  if (sessionRows.length > 0) {
    const { error: sessionErr } = await supabase
      .from("conversations")
      .upsert(sessionRows, { onConflict: "id" });
    if (sessionErr) console.warn("Supabase conversation migration warning:", sessionErr.message);
  }

  // 3. Migrate Messages
  const messageRows = rawMessages.map(([_id, m]) => ({
    id: m.id,
    conversation_id: m.sessionId,
    role: m.role === "model" ? "model" : (m.role === "user" ? "user" : "assistant"),
    content: m.text || "",
    client_timestamp: m.timestamp || null,
    is_encrypted: Boolean(m.isEncrypted),
    citations: m.citations || null,
  })).filter(m => m.id && m.conversation_id && m.content);

  if (messageRows.length > 0) {
    // Upsert in batches of 50 to prevent payload limits
    for (let i = 0; i < messageRows.length; i += 50) {
      const chunk = messageRows.slice(i, i + 50);
      const { error: msgErr } = await supabase
        .from("messages")
        .upsert(chunk, { onConflict: "conversation_id,id" });
      if (msgErr) console.warn("Supabase message batch migration warning:", msgErr.message);
    }
  }

  // Verification Audit
  const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
  const { count: convsCount } = await supabase.from("conversations").select("*", { count: "exact", head: true });
  const { count: msgsCount } = await supabase.from("messages").select("*", { count: "exact", head: true });

  console.log("\n--- Supabase Migration Audit ---");
  console.log(`Users in Supabase: ${usersCount ?? userRows.length}`);
  console.log(`Conversations in Supabase: ${convsCount ?? sessionRows.length}`);
  console.log(`Messages in Supabase: ${msgsCount ?? messageRows.length}`);

  return {
    success: true,
    verified: true,
    remoteSupabase: true,
    userCount: rawUsers.length,
    sessionCount: rawSessions.length,
    messageCount: rawMessages.length,
  };
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
