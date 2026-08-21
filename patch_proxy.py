import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace(
    'const response = await fetch("https://api.brevo.com/v3/smtp/email", {',
    'const response = await fetch("https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email", {'
)

with open("server.ts", "w") as f:
    f.write(content)

print("Restored proxy.")
