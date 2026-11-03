import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationStore } from "../store/locationStore";
import { json, renderApp, signIn } from "../test/utils";

vi.mock("react-leaflet", async () => (await import("../test/reactLeafletMock")).reactLeafletMock);

const fetchMock = vi.fn();
const KLCC = { id: 1, name: "Suria KLCC", latitude: 3.157324409, longitude: 101.7121981, createdAt: "" };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useLocationStore.getState().clear();
  signIn();
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("map page", () => {
  it("shows the user's saved places as markers", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { locations: [KLCC] }));
    renderApp("/map");
    expect(await screen.findByRole("button", { name: "Marker: Suria KLCC" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no places", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
    renderApp("/map");
    expect(await screen.findByText(/No places yet/)).toBeInTheDocument();
  });

  it("adds a place and shows its marker immediately, without reloading the list", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
    const { user } = renderApp("/map");
    await screen.findByText(/No places yet/);

    const zoo = { id: 2, name: "Zoo Negara", latitude: 3.2105416, longitude: 101.75920504, createdAt: "" };
    fetchMock.mockResolvedValueOnce(json(201, { location: zoo }));

    await user.type(screen.getByLabelText("Name"), "Zoo Negara");
    await user.type(screen.getByLabelText("Latitude"), "3.21054160");
    await user.type(screen.getByLabelText("Longitude"), "101.75920504");
    await user.click(screen.getByRole("button", { name: "Add to map" }));

    const marker = await screen.findByRole("button", { name: "Marker: Zoo Negara" });
    expect(screen.getByRole("status")).toHaveTextContent("Added Zoo Negara to your map.");
    expect(screen.getByLabelText("Name")).toHaveValue("");

    // One GET on load, one POST; no refetch of the list.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/locations");
    expect(JSON.parse(init.body)).toEqual({
      name: "Zoo Negara",
      latitude: 3.2105416,
      longitude: 101.75920504,
    });

    // Clicking the marker shows the place's name.
    await user.click(marker);
    expect(within(screen.getByRole("dialog")).getByText("Zoo Negara")).toBeInTheDocument();
  });

  it("validates the form before sending anything", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
    const { user } = renderApp("/map");
    await screen.findByText(/No places yet/);

    await user.type(screen.getByLabelText("Latitude"), "100");
    await user.type(screen.getByLabelText("Longitude"), "abc");
    await user.click(screen.getByRole("button", { name: "Add to map" }));

    expect(screen.getByText("Enter a name for this place.")).toBeInTheDocument();
    expect(screen.getByText("Latitude must be between -90 and 90.")).toBeInTheDocument();
    expect(screen.getByText(/Longitude must be a decimal number/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a server error when saving fails", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
    const { user } = renderApp("/map");
    await screen.findByText(/No places yet/);

    fetchMock.mockResolvedValueOnce(json(500, { error: "Internal server error" }));
    await user.type(screen.getByLabelText("Name"), "X");
    await user.type(screen.getByLabelText("Latitude"), "1");
    await user.type(screen.getByLabelText("Longitude"), "1");
    await user.click(screen.getByRole("button", { name: "Add to map" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Internal server error");
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    fetchMock.mockResolvedValueOnce(json(500, { error: "Internal server error" }));
    const { user } = renderApp("/map");
    const retry = await screen.findByRole("button", { name: "Try again" });

    fetchMock.mockResolvedValueOnce(json(200, { locations: [KLCC] }));
    await user.click(retry);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Marker: Suria KLCC" })).toBeInTheDocument(),
    );
  });
});
