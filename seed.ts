import fs from "fs";
import path from "path";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";

const DB_FILE = path.join(process.cwd(), "db.json");

async function seed() {
  let data: any = { users: [], sessions: [], messages: [] };
  if (fs.existsSync(DB_FILE)) {
    data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  }

  const usersMap = new Map(data.users);
  
  const emails = ["7soumyajitghosh@gmail.com", "404soumyajit@gmail.com"];
  const defaultPassword = await bcrypt.hash("password123", 10);

  for (const email of emails) {
    if (!usersMap.has(email)) {
      usersMap.set(email, {
        id: crypto.randomUUID(),
        name: email.split("@")[0],
        email: email,
        password: defaultPassword,
        createdAt: Date.now(),
        sessionTokens: []
      });
      console.log("Seeded user " + email)
    }
  }

  data.users = Array.from(usersMap.entries());
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  console.log("Database seeded successfully.");
}

seed();
