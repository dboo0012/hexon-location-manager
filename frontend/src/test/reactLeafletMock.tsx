import { type ReactNode, useState } from "react";
import { vi } from "vitest";

/**
 * Leaflet needs real layout to draw tiles, which jsdom cannot provide. This stand-in renders
 * each marker as a button whose popup content appears when it is clicked, mirroring the UX.
 */
const mapStub = {
  setView: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  once: vi.fn(),
  getZoom: () => 11,
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
  useMapEvents: () => mapStub,
};
