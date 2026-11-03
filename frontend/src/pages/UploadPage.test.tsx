import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationStore } from "../store/locationStore";
import { json, renderApp, signIn } from "../test/utils";

vi.mock("react-leaflet", async () => (await import("../test/reactLeafletMock")).reactLeafletMock);

const fetchMock = vi.fn();
const LOCATIONS = [
  { id: 10, name: "Suria KLCC", latitude: 3.157324409, longitude: 101.7121981, createdAt: "" },
  { id: 11, name: "Zoo Negara", latitude: 3.2105416, longitude: 101.75920504, createdAt: "" },
];

const zipFile = (name = "places.zip") => new File(["PK fake"], name, { type: "application/zip" });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("fetch", fetchMock);
  useLocationStore.getState().clear();
  signIn();
  // Initial GET /api/locations from the layout.
  fetchMock.mockResolvedValueOnce(json(200, { locations: [] }));
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const setup = () => renderApp("/upload");

async function uploadFile(user: ReturnType<typeof setup>["user"], file = zipFile()) {
  await user.upload(screen.getByLabelText("ZIP file"), file);
  await user.click(screen.getByRole("button", { name: "Upload and add to map" }));
}

describe("upload page", () => {
  it("shows a confirmation for 3 seconds, then adds the places to the map", async () => {
    const { user } = setup();
    fetchMock.mockResolvedValueOnce(
      json(201, { fileName: "places.txt", count: 2, locations: LOCATIONS }),
    );
    await uploadFile(user);

    const popup = await screen.findByRole("status", { name: "Upload complete" });
    expect(popup).toHaveTextContent("2 places from places.txt");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/locations/upload");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);

    // Still showing just before the 3 s mark; nothing added yet.
    await act(() => vi.advanceTimersByTimeAsync(2900));
    expect(screen.getByRole("status", { name: "Upload complete" })).toBeInTheDocument();
    expect(useLocationStore.getState().locations).toEqual([]);

    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(screen.queryByRole("status", { name: "Upload complete" })).not.toBeInTheDocument();
    expect(useLocationStore.getState().locations).toEqual(LOCATIONS);
    expect(screen.getByTestId("pathname")).toHaveTextContent("/map");
    expect(screen.getByRole("button", { name: "Marker: Zoo Negara" })).toBeInTheDocument();
  });

  it("shows the server's error for 3 seconds when the ZIP is invalid", async () => {
    const { user } = setup();
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: "The ZIP file must contain exactly one .txt file, but it contains 2 files",
        details: { files: ["a.txt", "b.txt"] },
      }),
    );
    await uploadFile(user);

    const popup = await screen.findByRole("alert");
    expect(popup).toHaveTextContent("Upload failed");
    expect(popup).toHaveTextContent("exactly one .txt file");

    await act(() => vi.advanceTimersByTimeAsync(2900));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/upload");
    expect(useLocationStore.getState().locations).toEqual([]);
  });

  it("lists line errors for malformed rows", async () => {
    const { user } = setup();
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: "The file has 1 invalid line. Line 4: Latitude must be between -90 and 90",
        details: { errors: ["Line 4: Latitude must be between -90 and 90"] },
      }),
    );
    await uploadFile(user);
    const popup = await screen.findByRole("alert");
    expect(popup.querySelector("li")).toHaveTextContent("Line 4: Latitude must be between -90 and 90");
  });

  it("rejects a non-ZIP file without contacting the server", async () => {
    setup();
    // fireEvent bypasses the input's accept filter, like a user choosing "All files" in the picker.
    fireEvent.change(screen.getByLabelText("ZIP file"), {
      target: { files: [new File(["Name,Lat,Lng"], "places.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent('"places.txt" is not a .zip file');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Upload and add to map" })).toBeDisabled();
  });
});
