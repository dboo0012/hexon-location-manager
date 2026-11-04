import { useState } from "react";
import { AddLocationForm } from "../components/AddLocationForm";
import { type LatLng, LocationMap } from "../components/LocationMap";
import { formatCoord } from "../lib/validateLocation";
import { useLocationStore } from "../store/locationStore";

export default function MapPage() {
  const locations = useLocationStore((s) => s.locations);
  const status = useLocationStore((s) => s.status);
  const error = useLocationStore((s) => s.error);
  const focusId = useLocationStore((s) => s.focusId);
  const load = useLocationStore((s) => s.load);
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [picking, setPicking] = useState(false);

  // Re-focusing an existing place reuses the store's focus mechanism.
  const focus = (id: number) => useLocationStore.setState({ focusId: id });

  return (
    <div className="flex h-full flex-col lg:block">
      <section aria-label="Map" className="relative h-[55vh] lg:absolute lg:inset-0 lg:h-auto">
        <LocationMap
          locations={locations}
          focusId={focusId}
          picking={picking}
          picked={picked}
          onPick={setPicked}
          onStartPicking={() => setPicking(true)}
        />
      </section>

      <aside className="z-[1000] flex min-h-0 flex-col overflow-y-auto border-t border-contour bg-white lg:absolute lg:top-4 lg:left-4 lg:max-h-[calc(100%-2rem)] lg:w-80 lg:rounded-lg lg:border lg:shadow-[0_12px_32px_-12px_rgba(29,42,51,0.35)]">
        <div className="p-5">
          <AddLocationForm picked={picked} picking={picking} onPickingChange={setPicking} />
        </div>

        <div className="border-t border-contour p-5 pt-4">
          <h2 className="mb-2 flex items-baseline justify-between font-bold">
            Your places
            {status === "ready" && (
              <span className="coords text-sm font-normal text-ink-soft">{locations.length}</span>
            )}
          </h2>

          {status === "loading" && <p className="text-ink-soft">Loading your places…</p>}
          {status === "error" && (
            <p className="text-danger">
              {error}{" "}
              <button type="button" onClick={() => void load()} className="font-semibold underline">
                Try again
              </button>
            </p>
          )}
          {status === "ready" && locations.length === 0 && (
            <p className="text-ink-soft">
              No places yet. Add one above or upload a ZIP of coordinates.
            </p>
          )}
          {locations.length > 0 && (
            <ul className="-mx-2 max-h-64 overflow-y-auto">
              {[...locations].reverse().map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => focus(loc.id)}
                    className={`w-full rounded-md px-2 py-1.5 text-left hover:bg-paper ${
                      loc.id === focusId ? "bg-survey/25" : ""
                    }`}
                  >
                    <span className="block truncate font-medium">{loc.name}</span>
                    <span className="coords block text-sm text-ink-soft">
                      {formatCoord(loc.latitude)}, {formatCoord(loc.longitude)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
