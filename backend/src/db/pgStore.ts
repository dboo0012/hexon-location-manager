import type { Pool } from "pg";
import type { Location, Store, User, UserWithHash } from "./store.js";

const LOCATION_COLUMNS = `id, name, latitude, longitude, created_at AS "createdAt"`;

/** PostgreSQL implementation of the store (Node server and Docker image). */
export function createPgStore(pool: Pool): Store {
  return {
    async ping() {
      try {
        await pool.query("SELECT 1");
        return true;
      } catch {
        return false;
      }
    },

    async createUser(email, passwordHash) {
      const { rows } = await pool.query<User>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email`,
        [email, passwordHash],
      );
      return rows[0] ?? null;
    },

    async findUserByEmail(email) {
      const { rows } = await pool.query<UserWithHash>(
        `SELECT id, email, password_hash AS "passwordHash" FROM users WHERE email = $1`,
        [email],
      );
      return rows[0] ?? null;
    },

    async findUserById(id) {
      const { rows } = await pool.query<User>("SELECT id, email FROM users WHERE id = $1", [id]);
      return rows[0] ?? null;
    },

    async listLocations(userId) {
      const { rows } = await pool.query<Location>(
        `SELECT ${LOCATION_COLUMNS} FROM locations WHERE user_id = $1 ORDER BY id`,
        [userId],
      );
      return rows;
    },

    async createLocation(userId, input) {
      const { rows } = await pool.query<Location>(
        `INSERT INTO locations (user_id, name, latitude, longitude)
         VALUES ($1, $2, $3, $4) RETURNING ${LOCATION_COLUMNS}`,
        [userId, input.name, input.latitude, input.longitude],
      );
      return rows[0]!;
    },

    async createLocations(userId, inputs) {
      if (inputs.length === 0) return [];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // One multi-row insert using parallel arrays keeps this to a single round trip.
        const { rows } = await client.query<Location>(
          `INSERT INTO locations (user_id, name, latitude, longitude)
           SELECT $1, * FROM unnest($2::text[], $3::float8[], $4::float8[])
           RETURNING ${LOCATION_COLUMNS}`,
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
    },
  };
}
