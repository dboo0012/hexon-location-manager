import type { Express } from "express";
import request from "supertest";
import { migrate } from "../src/db/migrate.js";
import { pool } from "../src/db/pool.js";

/** Migrates the test database (if needed) and empties all data tables. */
export async function resetDatabase() {
  await migrate(pool);
  await pool.query("TRUNCATE locations, users RESTART IDENTITY CASCADE");
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

export { pool };
