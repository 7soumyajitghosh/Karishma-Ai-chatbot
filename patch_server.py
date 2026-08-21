import re

with open("server.ts", "r") as f:
    content = f.read()

# 1. Remove proxy from sendBrevoEmail
content = content.replace(
    'const response = await fetch("https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email", {',
    'const response = await fetch("https://api.brevo.com/v3/smtp/email", {'
)

# 2. Fix forgot-password to error if user not found, so we don't show the screen if email isn't sent
target_forgot = """    const user = usersStore.get(email);
    
    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: "If an account exists, an OTP will be sent." });
    }"""
replacement_forgot = """    const user = usersStore.get(email);
    
    if (!user) {
      return res.status(400).json({ error: "No account found with this email address." });
    }"""
content = content.replace(target_forgot, replacement_forgot)

with open("server.ts", "w") as f:
    f.write(content)

print("Server patched.")
