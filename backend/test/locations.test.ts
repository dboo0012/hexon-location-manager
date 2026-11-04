import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { closeDatabase, registerUser, resetDatabase, store } from "./helpers.js";

const app = createApp(store);

beforeEach(resetDatabase);
afterAll(closeDatabase);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("/api/locations", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/locations")).status).toBe(401);
    expect(
      (await request(app).post("/api/locations").send({ name: "x", latitude: 1, longitude: 1 }))
        .status,
    ).toBe(401);
  });

  it("starts empty for a new user", async () => {
    const { token } = await registerUser(app);
    const res = await request(app).get("/api/locations").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.locations).toEqual([]);
  });

  it("creates a location and lists it", async () => {
    const { token } = await registerUser(app);
    const created = await request(app)
      .post("/api/locations")
      .set(auth(token))
      .send({ name: "  Suria KLCC ", latitude: 3.157324409, longitude: 101.7121981 });
    expect(created.status).toBe(201);
    expect(created.body.location).toMatchObject({
      id: expect.any(Number),
      name: "Suria KLCC",
      latitude: 3.157324409,
      longitude: 101.7121981,
    });

    const list = await request(app).get("/api/locations").set(auth(token));
    expect(list.body.locations).toEqual([created.body.location]);
  });

  it("accepts numeric strings for coordinates", async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .post("/api/locations")
      .set(auth(token))
      .send({ name: "Zoo Negara", latitude: "3.21054160", longitude: "101.75920504" });
    expect(res.status).toBe(201);
    expect(res.body.location.latitude).toBe(3.2105416);
  });

  it.each([
    [{ latitude: 1, longitude: 1 }, /Name is required/],
    [{ name: "   ", latitude: 1, longitude: 1 }, /Name is required/],
    [{ name: "x".repeat(201), latitude: 1, longitude: 1 }, /at most 200/],
    [{ name: "x", latitude: 90.0001, longitude: 1 }, /Latitude must be between -90 and 90/],
    [{ name: "x", latitude: -91, longitude: 1 }, /Latitude must be between/],
    [{ name: "x", latitude: 1, longitude: 180.5 }, /Longitude must be between -180 and 180/],
    [{ name: "x", latitude: "abc", longitude: 1 }, /Latitude must be a number/],
    [{ name: "x", latitude: 1 }, /Longitude must be a number/],
    [{ name: "x", latitude: "", longitude: 1 }, /Latitude must be a number/],
  ])("rejects invalid input %#", async (body, message) => {
    const { token } = await registerUser(app);
    const res = await request(app).post("/api/locations").set(auth(token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  it("keeps each user's locations private", async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/locations")
        .set(auth(alice.token))
        .send({ name: `Alice ${i}`, latitude: i, longitude: i });
      expect(res.status).toBe(201);
    }

    const aliceList = await request(app).get("/api/locations").set(auth(alice.token));
    expect(aliceList.body.locations).toHaveLength(5);

    const bobList = await request(app).get("/api/locations").set(auth(bob.token));
    expect(bobList.body.locations).toEqual([]);
  });

  it("ignores a user_id supplied in the body", async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    await request(app)
      .post("/api/locations")
      .set(auth(bob.token))
      .send({ name: "Sneaky", latitude: 1, longitude: 1, user_id: alice.user.id, userId: alice.user.id });

    const aliceList = await request(app).get("/api/locations").set(auth(alice.token));
    expect(aliceList.body.locations).toEqual([]);
  });
});
