import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "db.json");
const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const usersMap = new Map(data.users);

const origHash1 = "$2b$10$JPZdKFYUZ80ZPfH6aDK7Zu0EngzMFBFcPpTTOjeQ1/D/pmq..LVvO";
const origHash2 = "$2b$10$kepkaZahl73UX6iGDqNUDei2ZTkIfS72kPYWGyMTaI9iVHvZYBsua";

const u1: any = usersMap.get("7soumyajitghosh@gmail.com");
if (u1) u1.password = origHash1;

const u2: any = usersMap.get("404soumyajit@gmail.com");
if (u2) u2.password = origHash2;

data.users = Array.from(usersMap.entries());
fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
console.log("Reverted passwords");
