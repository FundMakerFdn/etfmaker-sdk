import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";

// Construct the absolute path to your .env file
const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

export default defineConfig({
  dialect: "postgresql", // or your respective database dialect
  schema: "./src/db/schema", // Path to your table definitions
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? "db",
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? "admin",
    password: process.env.DATABASE_PASSWORD ?? "postgres_pwd",
    database: process.env.DATABASE_NAME ?? "fund_maker_db",
    ssl: false,
  },
});
