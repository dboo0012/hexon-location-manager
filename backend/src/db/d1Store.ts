import type { Location, Store, User, UserWithHash } from "./store.js";

/**
 * The subset of Cloudflare's D1 binding this store uses. Declared structurally so this file
 * type-checks under Node (where the tests run it against Miniflare) as well as in the Worker.
 */
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<{ results: T[] }[]>;
}

const LOCATION_COLUMNS = "id, name, latitude, longitude, created_at AS createdAt";
/** D1 allows at most 100 bound parameters per statement; each row binds 4. */
const ROWS_PER_INSERT = 25;

/** Cloudflare D1 (SQLite) implementation of the store, used by the Worker. */
export function createD1Store(db: D1DatabaseLike): Store {
  return {
    async ping() {
      try {
        await db.prepare("SELECT 1").first();
        return true;
      } catch {
        return false;
      }
    },

    async createUser(email, passwordHash) {
      return db
        .prepare(
          `INSERT INTO users (email, password_hash) VALUES (?, ?)
           ON CONFLICT (email) DO NOTHING
           RETURNING id, email`,
        )
        .bind(email, passwordHash)
        .first<User>();
    },

    async findUserByEmail(email) {
      return db
        .prepare("SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?")
        .bind(email)
        .first<UserWithHash>();
    },

    async findUserById(id) {
      return db.prepare("SELECT id, email FROM users WHERE id = ?").bind(id).first<User>();
    },

    async listLocations(userId) {
      const { results } = await db
        .prepare(`SELECT ${LOCATION_COLUMNS} FROM locations WHERE user_id = ? ORDER BY id`)
        .bind(userId)
        .all<Location>();
      return results;
    },

    async createLocation(userId, input) {
      const row = await db
        .prepare(
          `INSERT INTO locations (user_id, name, latitude, longitude)
           VALUES (?, ?, ?, ?) RETURNING ${LOCATION_COLUMNS}`,
        )
        .bind(userId, input.name, input.latitude, input.longitude)
        .first<Location>();
      return row!;
    },

    async createLocations(userId, inputs) {
      if (inputs.length === 0) return [];
      const statements: D1PreparedStatementLike[] = [];
      for (let start = 0; start < inputs.length; start += ROWS_PER_INSERT) {
        const chunk = inputs.slice(start, start + ROWS_PER_INSERT);
        statements.push(
          db
            .prepare(
              `INSERT INTO locations (user_id, name, latitude, longitude)
               VALUES ${chunk.map(() => "(?, ?, ?, ?)").join(", ")}
               RETURNING ${LOCATION_COLUMNS}`,
            )
            .bind(...chunk.flatMap((i) => [userId, i.name, i.latitude, i.longitude])),
        );
      }
      // A D1 batch runs as a single transaction: if any statement fails, none are applied.
      const results = await db.batch<Location>(statements);
      return results.flatMap((r) => r.results).sort((a, b) => a.id - b.id);
    },
  };
}
