import re

with open("server.ts", "r") as f:
    content = f.read()

# Add import
content = content.replace('import * as crypto from "crypto";', 'import * as crypto from "crypto";\nimport * as nodemailer from "nodemailer";')

old_send_brevo = """const sendBrevoEmail = async (toEmail: string, otp: string) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables. Please add BREVO_API_KEY to your .env file to enable real OTP delivery.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
    const errorData = await response.json();
    throw new Error(`Brevo API Error: ${errorData.message}`);
  }
};"""

new_send_brevo = """const sendBrevoEmail = async (toEmail: string, otp: string) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "karishma.ai@outlook.com";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables. Please add BREVO_API_KEY to your .env file to enable real OTP delivery.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // TLS requires secureConnection false for 587, and use STARTTLS
    auth: {
      user: senderEmail, // Brevo SMTP login is typically the registered email, which we assume is the sender email here
      pass: apiKey
    }
  });

  const info = await transporter.sendMail({
    from: `"Karishma AI" <${senderEmail}>`,
    to: toEmail,
    subject: "Your Verification Code",
    html: `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #2C2A29;">Verify your email</h2>
          <p style="color: #5C5753;">Your verification code is:</p>
          <div style="background-color: #FAF8F5; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #EBE6DD; margin: 20px 0;">
            <span style="font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #D96B43;">${otp}</span>
          </div>
          <p style="color: #8C857E; font-size: 12px;">This code will expire in 10 minutes.</p>
        </div>`
  });
};"""

content = content.replace(old_send_brevo, new_send_brevo)

with open("server.ts", "w") as f:
    f.write(content)

print("done")
