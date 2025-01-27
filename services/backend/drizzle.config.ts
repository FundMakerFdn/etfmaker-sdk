import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql", // or your respective database dialect
  schema: "./src/db/tables.ts", // Path to your table definitions
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? "admin",
    password: process.env.DATABASE_PASSWORD ?? "postgres_pwd",
    database: process.env.DATABASE_NAME ?? "fund_maker_db",
    ssl: false,
  },
});
