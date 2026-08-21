import re

with open("server.ts", "r") as f:
    content = f.read()

new_send_brevo = """const sendBrevoEmail = async (toEmail: string, otp: string) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables.");
  }

  const response = await fetch("https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: "Karishma AI",
        email: senderEmail
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: "Your Verification Code",
      htmlContent: `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #2C2A29;">Verify your email</h2>
          <p style="color: #5C5753;">Your verification code is:</p>
          <div style="background-color: #FAF8F5; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #EBE6DD; margin: 20px 0;">
            <span style="font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #D96B43;">${otp}</span>
          </div>
          <p style="color: #8C857E; font-size: 12px;">This code will expire in 10 minutes.</p>
        </div>`
    })
  });

  if (!response.ok) {
    let errBody = await response.text().catch(() => "Unknown error");
    try {
      const errJson = JSON.parse(errBody);
      throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errJson)}`);
    } catch {
      throw new Error(`Brevo API Error (${response.status}): ${errBody}`);
    }
  }
};
"""

send_brevo_regex = re.compile(r'const sendBrevoEmail = async \(toEmail: string, otp: string\) => \{.*?\};\n', re.DOTALL)
content = send_brevo_regex.sub(new_send_brevo, content)

with open("server.ts", "w") as f:
    f.write(content)
