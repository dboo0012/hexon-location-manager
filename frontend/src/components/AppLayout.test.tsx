import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { json, renderApp, signIn } from "../test/utils";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useLocationStore.getState().clear();
  fetchMock.mockResolvedValue(
    json(200, {
      locations: [{ id: 1, name: "Suria KLCC", latitude: 3.15, longitude: 101.71, createdAt: "" }],
    }),
  );
  signIn("alice@example.com");
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("sidebar", () => {
  it("shows navigation, the signed-in email and the place count", async () => {
    renderApp("/map");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: /Map/ })).toHaveAttribute("href", "/map");
    expect(within(nav).getByRole("link", { name: /Upload file/ })).toHaveAttribute("href", "/upload");
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(await screen.findByLabelText("1 saved places")).toBeInTheDocument();
  });

  it("navigates between pages", async () => {
    const { user } = renderApp("/map");
    await user.click(screen.getByRole("link", { name: /Upload file/ }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/upload");
  });

  it("logs out, clears the session and returns to /login", async () => {
    const { user } = renderApp("/map");
    await waitFor(() => expect(useLocationStore.getState().locations).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(useAuthStore.getState().token).toBeNull();
    expect(useLocationStore.getState().locations).toEqual([]);
  });
});
