import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema"; // Import all schema definitions

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  // ssl: true, // Uncomment if SSL is required
  max: 100,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 25000,
  maxUses: 5000,
  allowExitOnIdle: true,
  application_name: "fund_maker_backend",
});

export const DataSource = drizzle(pool, { schema });
