import { readFile } from "node:fs/promises";
import type { Express } from "express";
import request from "supertest";
import type { Store } from "../src/db/store.js";

/**
 * The API tests run once per database driver (see the `projects` in vitest.config.ts):
 * - `pg`: the real PostgreSQL test database (what the Node server and Docker image use);
 * - `d1`: an in-memory Cloudflare D1 database run by Miniflare (what the Worker uses).
 */
export const driver: "pg" | "d1" = process.env.TEST_DB === "d1" ? "d1" : "pg";

interface Harness {
  store: Store;
  reset(): Promise<void>;
  close(): Promise<void>;
  /** Runs raw SQL with `?` placeholders and returns the rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

async function pgHarness(): Promise<Harness> {
  const { pool } = await import("../src/db/pool.js");
  const { migrate } = await import("../src/db/migrate.js");
  const { createPgStore } = await import("../src/db/pgStore.js");
  return {
    store: createPgStore(pool),
    async reset() {
      await migrate(pool);
      await pool.query("TRUNCATE locations, users RESTART IDENTITY CASCADE");
    },
    close: () => pool.end(),
    async query<T>(sql: string, params: unknown[] = []) {
      let n = 0;
      const { rows } = await pool.query(sql.replace(/\?/g, () => `$${++n}`), params);
      return rows as T[];
    },
  };
}

async function d1Harness(): Promise<Harness> {
  const { Miniflare } = await import("miniflare");
  const { createD1Store } = await import("../src/db/d1Store.js");
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response(null, { status: 404 }); } }",
    d1Databases: { DB: "hexon-locations-test" },
  });
  const db = await mf.getD1Database("DB");

  // Apply the same migration file `wrangler d1 migrations apply` uses in production.
  const schema = await readFile(new URL("../migrations-d1/0001_init.sql", import.meta.url), "utf8");
  const statements = schema
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const sql of statements) await db.prepare(sql).run();

  return {
    store: createD1Store(db),
    async reset() {
      await db.batch([
        db.prepare("DELETE FROM locations"),
        db.prepare("DELETE FROM users"),
        db.prepare("DELETE FROM sqlite_sequence"),
      ]);
    },
    close: () => mf.dispose(),
    async query<T>(sql: string, params: unknown[] = []) {
      const { results } = await db.prepare(sql).bind(...params).all();
      return results as T[];
    },
  };
}

const harness = driver === "d1" ? await d1Harness() : await pgHarness();

export const store = harness.store;
export const query = harness.query;
/** Migrates the test database (if needed) and empties all data tables. */
export const resetDatabase = () => harness.reset();
export const closeDatabase = () => harness.close();

export async function countLocations(): Promise<number> {
  const [row] = await query<{ n: number | string }>("SELECT count(*) AS n FROM locations");
  return Number(row!.n);
}

let counter = 0;

/** Registers a fresh user and returns its token and credentials. */
export async function registerUser(app: Express, email = `user${++counter}@example.com`) {
  const password = "password123";
  const res = await request(app).post("/api/auth/register").send({ email, password });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.token as string,
    user: res.body.user as { id: number; email: string },
    email,
    password,
  };
}
