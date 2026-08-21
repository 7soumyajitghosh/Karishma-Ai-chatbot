import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace(
    'return res.status(400).json({ error: "An account with this email already exists" });',
    'return res.status(400).json({ error: "An account with this email already exists. Please log in or use Forgot Password." });'
)

with open("server.ts", "w") as f:
    f.write(content)
