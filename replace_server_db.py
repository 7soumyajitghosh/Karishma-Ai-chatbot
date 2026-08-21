import re

with open("server.ts", "r") as f:
    content = f.read()

# Add usersStore modifications
user_store_regex = re.compile(r'const usersStore = new Map<string, any>\(\);')
new_stores = """// Simple in-memory database
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
const sessionMessagesIdx = new Map<string, string[]>(); // sessionId -> array of messageIds"""

content = user_store_regex.sub(new_stores, content)

# Modify pendingUser creation
pending_user_regex = re.compile(r'pendingUser: \{ name, email, password: hashedPassword \}')
new_pending_user = 'pendingUser: { id: crypto.randomUUID(), name, email, password: hashedPassword, createdAt: Date.now() }'
content = content.replace('pendingUser: { name, email, password: hashedPassword }', new_pending_user)

# Modify verify-otp success response
verify_success_regex = re.compile(r'user: \{ name: store\.pendingUser\.name, email: store\.pendingUser\.email \}')
new_verify_success = 'user: { id: store.pendingUser.id, name: store.pendingUser.name, email: store.pendingUser.email }'
content = content.replace('user: { name: store.pendingUser.name, email: store.pendingUser.email }', new_verify_success)

# Modify login success response
login_success_regex = re.compile(r'user: \{ name: user\.name, email: user\.email \}')
new_login_success = 'user: { id: user.id, name: user.name, email: user.email }'
content = content.replace('user: { name: user.name, email: user.email }', new_login_success)

# Add history endpoints
history_endpoints = """
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
"""

content = content.replace('// Chat endpoint', history_endpoints + '\n// Chat endpoint')

with open("server.ts", "w") as f:
    f.write(content)
print("Updated server.ts successfully")
