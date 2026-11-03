import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore";
import { fakeToken, json, renderApp, signIn } from "../test/utils";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ token: null, user: null });
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const pathname = () => screen.getByTestId("pathname").textContent;

describe("route protection", () => {
  it.each(["/map", "/upload"])("redirects signed-out visitors from %s to /login", (path) => {
    renderApp(path);
    expect(pathname()).toBe("/login");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("treats an expired token as signed out", () => {
    useAuthStore.setState({ token: fakeToken(-60), user: { id: 1, email: "a@b.c" } });
    renderApp("/map");
    expect(pathname()).toBe("/login");
  });

  it("sends signed-in users away from /login", () => {
    signIn();
    renderApp("/login");
    expect(pathname()).toBe("/map");
  });
});

describe("login", () => {
  it("signs in and returns to the page the user wanted", async () => {
    fetchMock.mockResolvedValue(json(200, { token: fakeToken(), user: { id: 7, email: "a@b.c" } }));
    const { user } = renderApp("/upload");

    await user.type(screen.getByLabelText("Email"), "a@b.c");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(pathname()).toBe("/upload"));
    expect(useAuthStore.getState().user).toEqual({ id: 7, email: "a@b.c" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.c", password: "password123" });
  });

  it("shows the server error for bad credentials", async () => {
    fetchMock.mockResolvedValue(json(401, { error: "Invalid email or password" }));
    const { user } = renderApp("/login");

    await user.type(screen.getByLabelText("Email"), "a@b.c");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(pathname()).toBe("/login");
  });
});

describe("register", () => {
  it("validates fields before calling the API", async () => {
    const { user } = renderApp("/register");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the account and opens the map", async () => {
    fetchMock.mockResolvedValue(json(201, { token: fakeToken(), user: { id: 3, email: "new@x.com" } }));
    const { user } = renderApp("/register");
    await user.type(screen.getByLabelText("Email"), "new@x.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(pathname()).toBe("/map"));
    expect(useAuthStore.getState().token).not.toBeNull();
  });

  it("shows a duplicate-email error from the server", async () => {
    fetchMock.mockResolvedValue(json(409, { error: "An account with this email already exists" }));
    const { user } = renderApp("/register");
    await user.type(screen.getByLabelText("Email"), "dup@x.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });
});
