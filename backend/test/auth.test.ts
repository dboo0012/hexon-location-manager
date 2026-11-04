import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { closeDatabase, query, registerUser, resetDatabase, store } from "./helpers.js";

const app = createApp(store);

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe("POST /api/auth/register", () => {
  it("creates a user with a hashed password and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "  Alice@Example.com ", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(Number), email: "alice@example.com" });
    expect(typeof res.body.token).toBe("string");

    const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users");
    expect(rows[0].password_hash).not.toBe("password123");
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    await registerUser(app, "bob@example.com");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "BOB@example.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it.each([
    [{ email: "not-an-email", password: "password123" }, /valid email/],
    [{ email: "a@b.com", password: "short" }, /at least 8/],
    [{}, /./],
  ])("validates input %#", async (body, message) => {
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns a token for valid credentials (email case-insensitive)", async () => {
    const { email, password } = await registerUser(app);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: email.toUpperCase(), password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.token).toBe("string");
  });

  it("returns 401 for a wrong password", async () => {
    const { email } = await registerUser(app);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("returns the same 401 for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@x.com", password: "whatever1" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid token", async () => {
    const { token, user } = await registerUser(app);
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
  });

  it("returns 401 without a token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });

  it("returns 401 for a tampered token", async () => {
    const { token } = await registerUser(app);
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}x`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a token signed with another secret", async () => {
    const forged = jwt.sign({ sub: "1", email: "a@b.c" }, "some-other-secret-value");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired token", async () => {
    const expired = jwt.sign({ sub: "1", email: "a@b.c" }, process.env.JWT_SECRET!, {
      expiresIn: -10,
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe("unknown routes", () => {
  it("return 404 JSON", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
