import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Supabase requires SSL

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
