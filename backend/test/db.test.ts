import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { migrate } from "../src/db/migrate.js";
import { pool, resetDatabase } from "./helpers.js";

beforeAll(resetDatabase);
afterAll(() => pool.end());

describe("database", () => {
  it("creates the users and locations tables", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(["locations", "schema_migrations", "users"]),
    );
  });

  it("is idempotent when migrations are re-run", async () => {
    expect(await migrate(pool)).toEqual([]);
  });

  it("rejects out-of-range coordinates at the database level", async () => {
    const {
      rows: [user],
    } = await pool.query("INSERT INTO users (email, password_hash) VALUES ('a@b.c', 'x') RETURNING id");
    await expect(
      pool.query("INSERT INTO locations (user_id, name, latitude, longitude) VALUES ($1, 'x', 91, 0)", [user.id]),
    ).rejects.toThrow(/check constraint/);
  });

  it("reports the database as up in /api/health", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });
});
