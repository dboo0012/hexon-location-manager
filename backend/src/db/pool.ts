import pg from "pg";
import { config } from "../config.js";

// Return DOUBLE PRECISION / NUMERIC as JS numbers rather than strings.
pg.types.setTypeParser(pg.types.builtins.FLOAT8, (v) => Number.parseFloat(v));

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });

export async function checkDatabase(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
