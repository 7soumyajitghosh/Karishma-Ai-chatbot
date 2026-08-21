import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace(
    'if (!user) return res.status(400).json({ error: "Invalid request." });',
    'if (!user) { console.error("Reset password failed: User not found for email", email); return res.status(400).json({ error: "Invalid request." }); }'
)

content = content.replace(
    'return res.status(400).json({ error: "No account found with this email address." });',
    'console.error("Forgot password failed: User not found for email", email); return res.status(400).json({ error: "No account found with this email address." });'
)

with open("server.ts", "w") as f:
    f.write(content)

print("Added logs.")
