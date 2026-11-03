import type { PoolClient } from "pg";
import type { LocationInput } from "../lib/locationSchema.js";
import { pool } from "./pool.js";

export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

const COLUMNS = `id, name, latitude, longitude, created_at AS "createdAt"`;

// Every query below is scoped by user_id, which always comes from the verified JWT.

export async function listLocations(userId: number): Promise<Location[]> {
  const { rows } = await pool.query<Location>(
    `SELECT ${COLUMNS} FROM locations WHERE user_id = $1 ORDER BY id`,
    [userId],
  );
  return rows;
}

export async function createLocation(userId: number, input: LocationInput): Promise<Location> {
  const { rows } = await pool.query<Location>(
    `INSERT INTO locations (user_id, name, latitude, longitude)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [userId, input.name, input.latitude, input.longitude],
  );
  return rows[0]!;
}

/** Inserts all locations atomically: either every row is saved or none is. */
export async function createLocations(
  userId: number,
  inputs: LocationInput[],
): Promise<Location[]> {
  if (inputs.length === 0) return [];
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    // One multi-row insert using parallel arrays keeps this to a single round trip.
    const { rows } = await client.query<Location>(
      `INSERT INTO locations (user_id, name, latitude, longitude)
       SELECT $1, * FROM unnest($2::text[], $3::float8[], $4::float8[])
       RETURNING ${COLUMNS}`,
      [
        userId,
        inputs.map((i) => i.name),
        inputs.map((i) => i.latitude),
        inputs.map((i) => i.longitude),
      ],
    );
    await client.query("COMMIT");
    return rows.sort((a, b) => a.id - b.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
