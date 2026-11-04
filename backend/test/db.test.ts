import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { closeDatabase, driver, query, resetDatabase, store } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(closeDatabase);

async function insertUser(email = "a@b.c") {
  const [user] = await query<{ id: number }>(
    "INSERT INTO users (email, password_hash) VALUES (?, 'x') RETURNING id",
    [email],
  );
  return user!;
}

describe(`database (${driver})`, () => {
  it.runIf(driver === "pg")("creates the users and locations tables", async () => {
    const rows = await query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(["locations", "schema_migrations", "users"]),
    );
  });

  it.runIf(driver === "pg")("is idempotent when migrations are re-run", async () => {
    const { migrate } = await import("../src/db/migrate.js");
    const { pool } = await import("../src/db/pool.js");
    expect(await migrate(pool)).toEqual([]);
  });

  it.runIf(driver === "d1")("creates the users and locations tables", async () => {
    const rows = await query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(["locations", "users"]));
  });

  it("rejects out-of-range coordinates at the database level", async () => {
    const user = await insertUser();
    await expect(
      query("INSERT INTO locations (user_id, name, latitude, longitude) VALUES (?, 'x', 91, 0)", [
        user.id,
      ]),
    ).rejects.toThrow(/check constraint/i);
  });

  it("treats emails as case-insensitive and unique", async () => {
    await insertUser("Case@Example.com");
    expect(await store.findUserByEmail("case@example.com")).toMatchObject({
      email: "Case@Example.com",
    });
    expect(await store.createUser("CASE@example.com", "x")).toBeNull();
  });

  it("rolls back a bulk insert when any row fails", async () => {
    const user = await insertUser();
    // 40 good rows then a bad one, so on D1 the failure lands in a later INSERT of the batch.
    const fine = Array.from({ length: 40 }, (_, i) => ({ name: `Fine ${i}`, latitude: 1, longitude: 1 }));
    await expect(
      store.createLocations(user.id, [...fine, { name: "Broken", latitude: 1000, longitude: 1 }]),
    ).rejects.toThrow();
    expect(await store.listLocations(user.id)).toEqual([]);
  });

  it("bulk inserts more rows than fit in a single statement, in order", async () => {
    const user = await insertUser();
    const inputs = Array.from({ length: 130 }, (_, i) => ({
      name: `Place ${i}`,
      latitude: (i % 180) - 89.5,
      longitude: i - 65,
    }));
    const saved = await store.createLocations(user.id, inputs);
    expect(saved.map((l) => l.name)).toEqual(inputs.map((i) => i.name));
    expect(saved[0]).toMatchObject({ latitude: -89.5, longitude: -65 });
    expect(await store.listLocations(user.id)).toHaveLength(130);
  });

  it("reports the database as up in /api/health", async () => {
    const res = await request(createApp(store)).get("/api/health");
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });
});
