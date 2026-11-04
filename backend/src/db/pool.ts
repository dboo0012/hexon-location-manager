import pg from "pg";
import { config } from "../config.js";

// Return DOUBLE PRECISION / NUMERIC as JS numbers rather than strings.
pg.types.setTypeParser(pg.types.builtins.FLOAT8, (v) => Number.parseFloat(v));

if (!config.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run the API against PostgreSQL");
}

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
