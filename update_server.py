import re

with open("server.ts", "r") as f:
    content = f.read()

# 1. Update User interface
content = content.replace("  createdAt: number;\n}", "  createdAt: number;\n  sessionTokens?: string[];\n}")

# 2. Update verify-otp
verify_otp_target = """    usersStore.set(email, store.pendingUser);
    otpStore.delete(email);

    res.json({ 
      success: true, 
      user: { id: store.pendingUser.id, name: store.pendingUser.name, email: store.pendingUser.email } 
    });"""

verify_otp_replacement = """    const token = crypto.randomUUID();
    const newUser = { ...store.pendingUser, sessionTokens: [token] };
    usersStore.set(email, newUser);
    otpStore.delete(email);

    res.json({ 
      success: true, 
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
      token
    });"""
content = content.replace(verify_otp_target, verify_otp_replacement)

# 3. Update login
login_target = """    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    });"""

login_replacement = """    const token = crypto.randomUUID();
    if (!user.sessionTokens) user.sessionTokens = [];
    user.sessionTokens.push(token);
    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email },
      token
    });"""
content = content.replace(login_target, login_replacement)

# 4. Add new auth endpoints before History endpoints
history_target = "// History endpoints"

new_endpoints = """// Password Management endpoints
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { userId, token, currentPassword, newPassword } = req.body;
    const user = Array.from(usersStore.values()).find(u => u.id === userId);
    
    if (!user || !user.sessionTokens?.includes(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!user.password) {
      return res.status(400).json({ error: "Account has no password set." });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect current password." });
    }

    // Hash new password and invalidate other sessions
    user.password = await bcrypt.hash(newPassword, 10);
    const newToken = crypto.randomUUID();
    user.sessionTokens = [newToken]; // Keep only the new session

    res.json({ success: true, token: newToken });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = usersStore.get(email);
    
    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: "If an account exists, an OTP will be sent." });
    }

    const existing = otpStore.get(email);
    if (existing && Date.now() < existing.resendAt) {
      return res.status(429).json({ error: "Please wait before requesting a new OTP." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    try {
      await sendBrevoEmail(email, otp);
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: "Failed to send reset email." });
    }

    otpStore.set(email, {
      hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      resendAt: Date.now() + 60 * 1000,
      attempts: 0,
      pendingUser: null // indicator for reset
    });

    res.json({ success: true, message: "Reset OTP sent." });
  } catch (error) {
    res.status(500).json({ error: "Failed to process request." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = usersStore.get(email);
    if (!user) return res.status(400).json({ error: "Invalid request." });

    const store = otpStore.get(email);
    if (!store || store.pendingUser !== null) {
      return res.status(400).json({ error: "No pending reset found." });
    }
    if (Date.now() > store.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP has expired." });
    }
    if (store.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: "Too many failed attempts." });
    }

    store.attempts++;
    const isValid = await bcrypt.compare(otp, store.hashedOtp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // Reset password and invalidate all sessions
    user.password = await bcrypt.hash(newPassword, 10);
    user.sessionTokens = [];
    otpStore.delete(email);

    res.json({ success: true, message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// History endpoints"""
content = content.replace(history_target, new_endpoints)

# 5. Require token in History endpoints
history_auth = """    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "Unauthorized" });
    const user = Array.from(usersStore.values()).find(u => u.id === userId);
    if (!user || !user.sessionTokens?.includes(token)) return res.status(401).json({ error: "Unauthorized" });"""

# apply to /api/history
content = content.replace("""    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });""", history_auth)

# apply to /api/history/save
content = content.replace("""    const { userId, session } = req.body;
    if (!userId || !session) return res.status(400).json({ error: "Invalid data" });
    
    // Verify user exists
    const userExists = Array.from(usersStore.values()).some(u => u.id === userId);
    if (!userExists) return res.status(401).json({ error: "Unauthorized" });""", history_auth.replace("const { userId, token }", "const { userId, token, session }") + "\n    if (!session) return res.status(400).json({ error: \"Invalid data\" });")

# apply to /api/history/delete
content = content.replace("""    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) return res.status(400).json({ error: "Invalid data" });""", history_auth.replace("const { userId, token }", "const { userId, token, sessionId }") + "\n    if (!sessionId) return res.status(400).json({ error: \"Invalid data\" });")


with open("server.ts", "w") as f:
    f.write(content)

print("Updated server.ts")
