import { migrate } from "../src/db/migrate.js";
import { pool } from "../src/db/pool.js";

/** Migrates the test database (once) and empties all data tables. */
export async function resetDatabase() {
  await migrate(pool);
  await pool.query("TRUNCATE locations, users RESTART IDENTITY CASCADE");
}

export { pool };
