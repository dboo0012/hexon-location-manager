import { useEffect, useMemo, useRef, useState } from "react";
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

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  locations: Location[];
  focusId: number | null;
  /** Picking mode: a ghost pin marks the map centre, which is reported as the map moves. */
  picking: boolean;
  /** The current pick (the map centre while picking), shown under the ghost pin. */
  picked: LatLng | null;
  onPick: (latlng: LatLng) => void;
  /** Clicking the map starts picking at the clicked spot. */
  onStartPicking: () => void;
}

export function LocationMap({
  locations,
  focusId,
  picking,
  picked,
  onPick,
  onStartPicking,
}: Props) {
  const markerRefs = useRef(new Map<number, L.Marker>());
  const icons = useMemo(() => ({ normal: pinIcon(false), fresh: pinIcon(true) }), []);
  const [moving, setMoving] = useState(false);

  return (
    <div className="relative h-full w-full">
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
        <ClickToPick onStartPicking={onStartPicking} />
        {picking && <CenterTracker onChange={onPick} onMovingChange={setMoving} />}
      </MapContainer>
      {picking && <GhostPin moving={moving} picked={picked} />}
    </div>
  );
}

/**
 * The pin being placed. It stays at the centre of the map while the map moves under it, so its
 * tip marks exactly the coordinates in the form. It lifts while the map is being dragged.
 */
function GhostPin({ moving, picked }: { moving: boolean; picked: LatLng | null }) {
  return (
    <div
      aria-hidden="true"
      data-testid="ghost-pin"
      className={`ghost-pin ${moving ? "ghost-pin--moving" : ""}`}
    >
      <span className="ghost-pin__shadow" />
      <span className="ghost-pin__icon" dangerouslySetInnerHTML={{ __html: PIN_SVG }} />
      {picked && (
        <span className="ghost-pin__coords coords">
          {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
        </span>
      )}
    </div>
  );
}

/** While picking, reports the map centre as the map moves (and once when picking starts). */
function CenterTracker({
  onChange,
  onMovingChange,
}: {
  onChange: (latlng: LatLng) => void;
  onMovingChange: (moving: boolean) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const report = () => {
      const { lat, lng } = map.getCenter().wrap();
      onChange({ lat, lng });
    };
    const start = () => onMovingChange(true);
    const end = () => {
      onMovingChange(false);
      report();
    };
    report();
    map.on("move", report);
    map.on("movestart", start);
    map.on("moveend", end);
    return () => {
      map.off("move", report);
      map.off("movestart", start);
      map.off("moveend", end);
      onMovingChange(false);
    };
  }, [map, onChange, onMovingChange]);
  return null;
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
      map.fitBounds(L.latLngBounds(locations.map((l) => [l.latitude, l.longitude])), {
        padding: [48, 48],
        maxZoom: 15,
      });
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
    map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom(), 13), {
      duration: 0.8,
    });
    map.once("moveend", () => markers.current.get(focusId)?.openPopup());
  }, [focusId, locations, map, markers]);
  return null;
}

/** Clicking the map starts picking there: the map glides so the clicked spot is under the pin. */
function ClickToPick({ onStartPicking }: { onStartPicking: () => void }) {
  const map = useMapEvents({
    click: (e) => {
      onStartPicking();
      map.panTo(e.latlng);
    },
  });
  return null;
}
