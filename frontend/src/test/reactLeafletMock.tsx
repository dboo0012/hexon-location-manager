import { type ReactNode, useState } from "react";
import { vi } from "vitest";

/**
 * Leaflet needs real layout to draw tiles, which jsdom cannot provide. This stand-in renders
 * each marker as a button whose popup content appears when it is clicked, mirroring the UX.
 */
type Handler = (e?: unknown) => void;
const listeners = new Map<string, Set<Handler>>();
const emit = (event: string, e?: unknown) => listeners.get(event)?.forEach((fn) => fn(e));
let center = { lat: 3.139, lng: 101.6869 };
let mapEventHandlers: Record<string, Handler> = {};

export const mapStub = {
  setView: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  once: vi.fn(),
  getZoom: () => 11,
  getCenter: () => ({ ...center, wrap: () => ({ ...center }) }),
  on: (event: string, fn: Handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
  },
  off: (event: string, fn: Handler) => listeners.get(event)?.delete(fn),
  /** Simulates the user dragging the map so that `lat, lng` ends up in the centre. */
  panTo: (latlng: { lat: number; lng: number }) => {
    emit("movestart");
    center = { lat: latlng.lat, lng: latlng.lng };
    emit("move");
    emit("moveend");
  },
  /** Simulates a click on the map at `lat, lng` (handlers registered with useMapEvents). */
  click: (latlng: { lat: number; lng: number }) => mapEventHandlers.click?.({ latlng }),
  reset: () => {
    listeners.clear();
    center = { lat: 3.139, lng: 101.6869 };
    mapEventHandlers = {};
  },
};

export const reactLeafletMock = {
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  ZoomControl: () => null,
  Marker: ({ children, title }: { children: ReactNode; title: string }) => {
    const [open, setOpen] = useState(false);
    return (
      <div data-testid="marker">
        <button type="button" aria-label={`Marker: ${title}`} onClick={() => setOpen(true)} />
        {open && <div role="dialog">{children}</div>}
      </div>
    );
  },
  Popup: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMap: () => mapStub,
  useMapEvents: (handlers: Record<string, Handler>) => {
    mapEventHandlers = handlers;
    return mapStub;
  },
};
