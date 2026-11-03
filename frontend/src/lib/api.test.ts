import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore";
import { api, ApiError } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ token: null, user: null });
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("api client", () => {
  it("sends the bearer token when signed in", async () => {
    useAuthStore.setState({ token: "abc", user: { id: 1, email: "a@b.c" } });
    fetchMock.mockResolvedValue(json(200, { locations: [] }));
    await api.listLocations();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer abc");
  });

  it("throws ApiError with the server message and details", async () => {
    fetchMock.mockResolvedValue(json(400, { error: "Bad file", details: { errors: ["Line 2: x"] } }));
    const err = await api.login("a", "b").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe("Bad file");
    expect((err as ApiError).lineErrors).toEqual(["Line 2: x"]);
  });

  it("signs the user out when an authenticated request gets 401", async () => {
    useAuthStore.setState({ token: "expired", user: { id: 1, email: "a@b.c" } });
    fetchMock.mockResolvedValue(json(401, { error: "Invalid or expired token" }));
    await expect(api.listLocations()).rejects.toThrow("Invalid or expired token");
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("reports network failures clearly", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.me()).rejects.toThrow(/Cannot reach the server/);
  });
});
