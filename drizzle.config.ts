import { type Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  // tablesFilter: ["underground_*"],
} satisfies Config;
