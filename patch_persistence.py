import re

with open("server.ts", "r") as f:
    content = f.read()

# Replace memory maps with file-backed logic, or just add a simple save/load mechanism
import_addition = """import fs from "fs";
import path from "path";
"""
if "import fs from" not in content:
    content = content.replace('import express from "express";', import_addition + 'import express from "express";')

persistence_logic = """
const DB_FILE = path.join(process.cwd(), "db.json");

// Define basic stores
let usersStore = new Map<string, User>();
let sessionsDb = new Map<string, ChatSession>();
let messagesDb = new Map<string, ChatMessage>();

// Load from DB
try {
  if (fs.existsSync(DB_FILE)) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (data.users) usersStore = new Map(data.users);
    if (data.sessions) sessionsDb = new Map(data.sessions);
    if (data.messages) messagesDb = new Map(data.messages);
  }
} catch (e) {
  console.error("Failed to load DB", e);
}

const saveDb = () => {
  try {
    const data = {
      users: Array.from(usersStore.entries()),
      sessions: Array.from(sessionsDb.entries()),
      messages: Array.from(messagesDb.entries()),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save DB", e);
  }
};
"""

content = re.sub(
    r'const usersStore = new Map<string, User>\(\);\s*const sessionsDb = new Map<string, ChatSession>\(\);\s*const messagesDb = new Map<string, ChatMessage>\(\);',
    persistence_logic,
    content
)

# Replace all `.set` and `.delete` for these maps to also call `saveDb()`
content = re.sub(r'(usersStore\.set\(.*?\);)', r'\1 saveDb();', content)
content = re.sub(r'(usersStore\.delete\(.*?\);)', r'\1 saveDb();', content)
content = re.sub(r'(sessionsDb\.set\(.*?\);)', r'\1 saveDb();', content)
content = re.sub(r'(sessionsDb\.delete\(.*?\);)', r'\1 saveDb();', content)
content = re.sub(r'(messagesDb\.set\(.*?\);)', r'\1 saveDb();', content)
content = re.sub(r'(messagesDb\.delete\(.*?\);)', r'\1 saveDb();', content)

# But wait, in reset password: `user.password = ...; user.sessionTokens = [];` we need to call saveDb()
content = content.replace(
    'user.sessionTokens = [];\n    otpStore.delete(email);',
    'user.sessionTokens = [];\n    saveDb();\n    otpStore.delete(email);'
)

# In change password: `user.password = ...; user.sessionTokens = [];`
content = content.replace(
    'user.password = await bcrypt.hash(newPassword, 10);\n    user.sessionTokens = [token];',
    'user.password = await bcrypt.hash(newPassword, 10);\n    user.sessionTokens = [token];\n    saveDb();'
)

with open("server.ts", "w") as f:
    f.write(content)

print("Added persistence to server.ts")
