import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { L } from "../lib/leaflet";
import { formatCoord } from "../lib/validateLocation";
import type { Location } from "../types";

/** Kuala Lumpur: the brief's sample data is here, so it is a sensible empty-state view. */
const DEFAULT_CENTER: [number, number] = [3.139, 101.6869];
const DEFAULT_ZOOM = 11;

const PIN_SVG = `<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 1C7.7 1 1.5 7.2 1.5 15.2 1.5 25.8 16 39 16 39s14.5-13.2 14.5-23.8C30.5 7.2 24.3 1 16 1z" fill="#2a4bd7" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#f2c14e"/></svg>`;

const pinIcon = (fresh: boolean) =>
  L.divIcon({
    html: PIN_SVG,
    className: fresh ? "pin pin--new" : "pin",
    iconSize: [32, 40],
    iconAnchor: [16, 39],
    popupAnchor: [0, -36],
  });

interface Props {
  locations: Location[];
  focusId: number | null;
  onPick: (latlng: { lat: number; lng: number }) => void;
}

export function LocationMap({ locations, focusId, onPick }: Props) {
  const markerRefs = useRef(new Map<number, L.Marker>());
  const icons = useMemo(() => ({ normal: pinIcon(false), fresh: pinIcon(true) }), []);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      worldCopyJump
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {/* Top-left is taken by the add-place panel on wide screens. */}
      <ZoomControl position="bottomright" />
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.latitude, loc.longitude]}
          icon={loc.id === focusId ? icons.fresh : icons.normal}
          title={loc.name}
          alt={loc.name}
          ref={(marker) => {
            if (marker) markerRefs.current.set(loc.id, marker);
            else markerRefs.current.delete(loc.id);
          }}
        >
          <Popup>
            <strong className="block text-base">{loc.name}</strong>
            <span className="coords text-ink-soft">
              {formatCoord(loc.latitude)}, {formatCoord(loc.longitude)}
            </span>
          </Popup>
        </Marker>
      ))}
      <FitOnLoad locations={locations} />
      <FlyToFocus locations={locations} focusId={focusId} markers={markerRefs} />
      <ClickToPick onPick={onPick} />
    </MapContainer>
  );
}

/** Frames all saved places once, when they first arrive. */
function FitOnLoad({ locations }: { locations: Location[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || locations.length === 0) return;
    done.current = true;
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 14);
    } else {
      map.fitBounds(
        L.latLngBounds(locations.map((l) => [l.latitude, l.longitude])),
        { padding: [48, 48], maxZoom: 15 },
      );
    }
  }, [locations, map]);
  return null;
}

/** Moves to a newly added place and opens its name popup. */
function FlyToFocus({
  locations,
  focusId,
  markers,
}: {
  locations: Location[];
  focusId: number | null;
  markers: React.RefObject<Map<number, L.Marker>>;
}) {
  const map = useMap();
  const lastFocus = useRef<number | null>(focusId);
  useEffect(() => {
    if (focusId === null || focusId === lastFocus.current) return;
    lastFocus.current = focusId;
    const loc = locations.find((l) => l.id === focusId);
    if (!loc) return;
    map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 });
    map.once("moveend", () => markers.current.get(focusId)?.openPopup());
  }, [focusId, locations, map, markers]);
  return null;
}

function ClickToPick({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.wrap()) });
  return null;
}
