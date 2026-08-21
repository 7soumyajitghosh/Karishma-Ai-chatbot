with open(".env.example", "r") as f:
    content = f.read()

if "BREVO_SMTP_LOGIN" not in content:
    content = content.replace(
        'BREVO_SENDER_EMAIL="karishma.ai@outlook.com"',
        'BREVO_SENDER_EMAIL="karishma.ai@outlook.com"\n# BREVO_SMTP_LOGIN is optional. If your Brevo login email is different from your sender email, provide it here.\nBREVO_SMTP_LOGIN=""'
    )
    with open(".env.example", "w") as f:
        f.write(content)
