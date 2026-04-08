import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const require = createRequire(import.meta.url);
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

await sql`ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS is_ai_powered BOOLEAN NOT NULL DEFAULT FALSE`;
console.log("✓ is_ai_powered column ready");
await sql.end();
