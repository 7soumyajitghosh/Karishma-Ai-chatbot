import re

with open("server.ts", "r") as f:
    content = f.read()

# 1. Remove nodemailer import
content = content.replace('import nodemailer from "nodemailer";\n', '')

old_get_transporter = """const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN } = process.env;
  
  if (!SMTP_HOST || !SMTP_USER) {
    throw new Error("SMTP_HOST and SMTP_USER are not configured in environment variables.");
  }
  
  const isOAuth = !!(OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && OAUTH_REFRESH_TOKEN);
  
  if (!isOAuth && !SMTP_PASS) {
    throw new Error("Please configure either SMTP_PASS for basic auth, or OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and OAUTH_REFRESH_TOKEN for OAuth2 modern authentication.");
  }

  return {
    transporter: nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_PORT === "465",
      auth: isOAuth ? {
        type: 'OAuth2',
        user: SMTP_USER,
        clientId: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        refreshToken: OAUTH_REFRESH_TOKEN,
      } : {
        type: 'login',
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    }),
    from: SMTP_FROM || SMTP_USER
  };
};"""

new_send_brevo = """const sendBrevoEmail = async (toEmail: string, otp: string) => {
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
        </div>`,
      textContent: `Your verification code is: ${otp}. It will expire in 10 minutes.`
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errorData)}`);
  }

  return response.json();
};"""

content = content.replace(old_get_transporter, new_send_brevo)

old_email_try_catch = """    try {
      const { transporter, from } = getTransporter();
      await transporter.sendMail({
        from: `"Karishma AI" <${from}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
        html: `<div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #2C2A29;">Verify your email</h2>
          <p style="color: #5C5753;">Your verification code is:</p>
          <div style="background-color: #FAF8F5; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #EBE6DD; margin: 20px 0;">
            <span style="font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #D96B43;">${otp}</span>
          </div>
          <p style="color: #8C857E; font-size: 12px;">This code will expire in 10 minutes.</p>
        </div>`
      });
      console.log(`OTP successfully sent to ${email} via SMTP.`);
    } catch (emailError: any) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({ error: emailError.message || "Failed to send verification email. Please check SMTP configuration." });
    }"""

new_email_try_catch = """    try {
      await sendBrevoEmail(email, otp);
      console.log(`OTP successfully sent to ${email} via Brevo API.`);
    } catch (emailError: any) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({ error: emailError.message || "Failed to send verification email. Please check Brevo configuration." });
    }"""

content = content.replace(old_email_try_catch, new_email_try_catch)

with open("server.ts", "w") as f:
    f.write(content)
print("Replaced successfully")
