import postgres from "postgres";
import { readFileSync } from "fs";

// Parse .env.local manually
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* no .env.local */ }

const sql = postgres(process.env.DATABASE_URL);

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE`;
console.log("✓ api_key column added to users");
await sql.end();
