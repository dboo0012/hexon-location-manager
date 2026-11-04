import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationStore } from "../store/locationStore";
import { mapStub } from "../test/reactLeafletMock";
import { json, renderApp, signIn } from "../test/utils";

vi.mock("react-leaflet", async () => (await import("../test/reactLeafletMock")).reactLeafletMock);

const fetchMock = vi.fn();
const KLCC = { id: 1, name: "Suria KLCC", latitude: 3.157324409, longitude: 101.7121981, createdAt: "" };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useLocationStore.getState().clear();
  mapStub.reset();
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

  describe("picking on the map", () => {
    async function openMap() {
      fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
      const result = renderApp("/map");
      await screen.findByText(/No places yet/);
      return result;
    }

    it("shows a ghost pin at the map centre and fills in its coordinates", async () => {
      const { user } = await openMap();
      expect(screen.queryByTestId("ghost-pin")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Pick on map" }));

      expect(screen.getByTestId("ghost-pin")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Latitude")).toHaveValue("3.139000");
      expect(screen.getByLabelText("Longitude")).toHaveValue("101.686900");
    });

    it("updates the coordinates as the map is dragged", async () => {
      const { user } = await openMap();
      await user.click(screen.getByRole("button", { name: "Pick on map" }));

      act(() => mapStub.panTo({ lat: 3.2105416, lng: 101.75920504 }));

      expect(screen.getByLabelText("Latitude")).toHaveValue("3.210542");
      expect(screen.getByLabelText("Longitude")).toHaveValue("101.759205");
      expect(screen.getByTestId("ghost-pin")).toHaveTextContent("3.210542, 101.759205");
    });

    it("starts picking where the map is clicked", async () => {
      await openMap();
      act(() => mapStub.click({ lat: -33.8568, lng: 151.2153 }));

      expect(screen.getByTestId("ghost-pin")).toBeInTheDocument();
      expect(screen.getByLabelText("Latitude")).toHaveValue("-33.856800");
      expect(screen.getByLabelText("Longitude")).toHaveValue("151.215300");
    });

    it("stops following the map when coordinates are typed, or after adding", async () => {
      const { user } = await openMap();
      await user.click(screen.getByRole("button", { name: "Pick on map" }));
      await user.clear(screen.getByLabelText("Latitude"));
      await user.type(screen.getByLabelText("Latitude"), "1.5");

      expect(screen.queryByTestId("ghost-pin")).not.toBeInTheDocument();
      act(() => mapStub.panTo({ lat: 10, lng: 10 }));
      expect(screen.getByLabelText("Latitude")).toHaveValue("1.5");

      await user.click(screen.getByRole("button", { name: "Pick on map" }));
      const place = { id: 3, name: "Pinned", latitude: 10, longitude: 10, createdAt: "" };
      fetchMock.mockResolvedValueOnce(json(201, { location: place }));
      await user.type(screen.getByLabelText("Name"), "Pinned");
      await user.click(screen.getByRole("button", { name: "Add to map" }));

      await screen.findByRole("button", { name: "Marker: Pinned" });
      expect(screen.queryByTestId("ghost-pin")).not.toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ latitude: 10, longitude: 10 });
    });
  });
});
