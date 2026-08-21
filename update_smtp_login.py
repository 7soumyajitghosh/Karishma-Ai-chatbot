import re

with open("server.ts", "r") as f:
    content = f.read()

content = content.replace(
    'user: senderEmail, // Brevo SMTP login is typically the registered email, which we assume is the sender email here',
    'user: process.env.BREVO_SMTP_LOGIN || senderEmail, // Fallback to senderEmail if BREVO_SMTP_LOGIN is not provided'
)

with open("server.ts", "w") as f:
    f.write(content)

