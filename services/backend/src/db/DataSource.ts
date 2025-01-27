import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Create a new PostgreSQL client instance
const client = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  // ssl: true, // Uncomment if SSL is required
});

// Connect to the database
await client.connect();

export const DataSource = drizzle(client);
