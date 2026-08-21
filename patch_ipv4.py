import re

with open("server.ts", "r") as f:
    content = f.read()

# I want to restore the old sendBrevoEmail, but use https.request with family: 4
new_send_brevo = """const sendBrevoEmail = async (toEmail: string, otp: string) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables.");
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
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
    });

    const https = require('https');
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      family: 4, // Force IPv4
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res: any) => {
      let body = '';
      res.on('data', (d: any) => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          try {
            const errData = JSON.parse(body);
            reject(new Error(`Brevo API Error (${res.statusCode}): ${JSON.stringify(errData)}`));
          } catch (e) {
            reject(new Error(`Brevo API Error (${res.statusCode}): ${body}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};
"""

send_brevo_regex = re.compile(r'const sendBrevoEmail = async \(toEmail: string, otp: string\) => \{.*?\};\n', re.DOTALL)
content = send_brevo_regex.sub(new_send_brevo, content)

with open("server.ts", "w") as f:
    f.write(content)
