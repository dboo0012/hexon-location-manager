import { create } from "zustand";
import { api } from "../lib/api";
import type { Location, LocationInput } from "../types";
import { useAuthStore } from "./authStore";

type Status = "idle" | "loading" | "ready" | "error";

interface LocationState {
  locations: Location[];
  status: Status;
  error: string | null;
  /** Id of the most recently added location, so the map can fly to it. */
  focusId: number | null;
  load: () => Promise<void>;
  add: (input: LocationInput) => Promise<Location>;
  addMany: (locations: Location[]) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  locations: [],
  status: "idle",
  error: null,
  focusId: null,

  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const { locations } = await api.listLocations();
      set({ locations, status: "ready" });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  add: async (input) => {
    const { location } = await api.createLocation(input);
    set((s) => ({ locations: mergeById(s.locations, [location]), focusId: location.id }));
    return location;
  },

  addMany: (locations) =>
    set((s) => ({
      locations: mergeById(s.locations, locations),
      focusId: locations.at(-1)?.id ?? s.focusId,
    })),

  clear: () => set({ locations: [], status: "idle", error: null, focusId: null }),
}));

function mergeById(existing: Location[], incoming: Location[]): Location[] {
  const ids = new Set(existing.map((l) => l.id));
  return [...existing, ...incoming.filter((l) => !ids.has(l.id))];
}

// Never let one user's markers linger in memory after they sign out.
useAuthStore.subscribe((state, prev) => {
  if (state.token !== prev.token) useLocationStore.getState().clear();
});
