import AdmZip from "adm-zip";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { pool, registerUser, resetDatabase } from "./helpers.js";

const app = createApp();

beforeEach(resetDatabase);
afterAll(() => pool.end());

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function zipOf(files: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) zip.addFile(name, Buffer.from(content));
  return zip.toBuffer();
}

const SAMPLE = `Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
`;

const upload = (token: string, buffer: Buffer, filename = "locations.zip") =>
  request(app).post("/api/locations/upload").set(auth(token)).attach("file", buffer, filename);

describe("POST /api/locations/upload", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/locations/upload")
      .attach("file", zipOf({ "a.txt": SAMPLE }), "a.zip");
    expect(res.status).toBe(401);
  });

  it("imports every location from a valid ZIP for the current user only", async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    const res = await upload(alice.token, zipOf({ "locations.txt": SAMPLE }));
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);
    expect(res.body.fileName).toBe("locations.txt");
    expect(res.body.locations.map((l: { name: string }) => l.name)).toEqual([
      "Suria KLCC",
      "Zoo Negara",
    ]);

    const aliceList = await request(app).get("/api/locations").set(auth(alice.token));
    expect(aliceList.body.locations).toEqual(res.body.locations);

    const bobList = await request(app).get("/api/locations").set(auth(bob.token));
    expect(bobList.body.locations).toEqual([]);
  });

  it("rejects a ZIP containing more than one file and saves nothing", async () => {
    const { token } = await registerUser(app);
    const res = await upload(token, zipOf({ "a.txt": SAMPLE, "b.txt": SAMPLE }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one .txt file/);
    expect(res.body.details.files).toEqual(["a.txt", "b.txt"]);
    expect((await pool.query("SELECT count(*)::int AS n FROM locations")).rows[0].n).toBe(0);
  });

  it("rejects a ZIP containing a non-text file", async () => {
    const { token } = await registerUser(app);
    const res = await upload(token, zipOf({ "data.json": "{}" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must contain a .txt file/);
  });

  it("rejects a file that is not a ZIP", async () => {
    const { token } = await registerUser(app);
    const res = await upload(token, Buffer.from(SAMPLE), "locations.txt");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Only .zip files are accepted");
  });

  it("rejects a corrupt file with a .zip extension", async () => {
    const { token } = await registerUser(app);
    const res = await upload(token, Buffer.from("PK this is not really a zip"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a valid ZIP/);
  });

  it("rejects the whole file when any row is invalid", async () => {
    const { token } = await registerUser(app);
    const res = await upload(token, zipOf({ "a.txt": `${SAMPLE}Broken,999,1\n` }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/1 invalid line\. Line 4: Latitude must be between/);
    expect((await pool.query("SELECT count(*)::int AS n FROM locations")).rows[0].n).toBe(0);
  });

  it("returns 400 when no file is attached", async () => {
    const { token } = await registerUser(app);
    const res = await request(app).post("/api/locations/upload").set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Attach a .zip file/);
  });

  it("returns 400 when more than one file is attached", async () => {
    const { token } = await registerUser(app);
    const zip = zipOf({ "a.txt": SAMPLE });
    const res = await request(app)
      .post("/api/locations/upload")
      .set(auth(token))
      .attach("file", zip, "a.zip")
      .attach("file", zip, "b.zip");
    expect(res.status).toBe(400);
  });
});
