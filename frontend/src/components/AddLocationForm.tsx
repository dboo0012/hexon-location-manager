import { type FormEvent, useState } from "react";
import type { LatLng } from "./LocationMap";
import { useLocationStore } from "../store/locationStore";
import {
  type LocationFormErrors,
  type LocationFormValues,
  validateLocation,
} from "../lib/validateLocation";
import { FormAlert } from "./Alert";
import { FormField } from "./FormField";

const EMPTY: LocationFormValues = { name: "", latitude: "", longitude: "" };

interface Props {
  /** Coordinates picked on the map; they overwrite the coordinate fields whenever they change. */
  picked: LatLng | null;
  picking: boolean;
  onPickingChange: (picking: boolean) => void;
}

/** Name / latitude / longitude form, with a "Pick on map" mode that follows a ghost pin. */
export function AddLocationForm({ picked, picking, onPickingChange }: Props) {
  const add = useLocationStore((s) => s.add);
  const [values, setValues] = useState<LocationFormValues>(EMPTY);
  const [errors, setErrors] = useState<LocationFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A new pick overwrites the coordinate fields (adjusting state during render, not in an effect).
  const [lastPicked, setLastPicked] = useState(picked);
  if (picked !== lastPicked) {
    setLastPicked(picked);
    if (picked) {
      setValues((v) => ({ ...v, latitude: picked.lat.toFixed(6), longitude: picked.lng.toFixed(6) }));
      setErrors((e) => ({ ...e, latitude: undefined, longitude: undefined }));
    }
  }

  const set = (field: keyof LocationFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setSaved(null);
    // Typing coordinates by hand takes over from the pin.
    if (field !== "name" && picking) onPickingChange(false);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateLocation(values);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setSaving(true);
    try {
      const location = await add(result.input);
      setValues(EMPTY);
      setSaved(location.name);
      onPickingChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="add-place-title" className="space-y-3">
      <h2 id="add-place-title" className="text-lg font-bold">
        Add a place
      </h2>
      <FormAlert message={serverError} />
      <FormField
        label="Name"
        value={values.name}
        onChange={set("name")}
        error={errors.name}
        placeholder="Suria KLCC"
        maxLength={200}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Latitude"
          inputMode="decimal"
          className="coords"
          value={values.latitude}
          onChange={set("latitude")}
          error={errors.latitude}
          placeholder="3.157324"
        />
        <FormField
          label="Longitude"
          inputMode="decimal"
          className="coords"
          value={values.longitude}
          onChange={set("longitude")}
          error={errors.longitude}
          placeholder="101.712198"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-pressed={picking}
          onClick={() => onPickingChange(!picking)}
          className={`btn-pick ${picking ? "btn-pick--on" : ""}`}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path
              d="M10 1.5c-3.3 0-6 2.5-6 5.8 0 4.3 6 11.2 6 11.2s6-6.9 6-11.2c0-3.3-2.7-5.8-6-5.8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="10" cy="7.3" r="2.2" fill="currentColor" />
          </svg>
          {picking ? "Done" : "Pick on map"}
        </button>
        <p className="text-sm text-ink-soft">
          {picking ? "Drag the map to move the pin." : "Or click anywhere on the map."}
        </p>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? "Adding…" : "Add to map"}
      </button>
      <p role="status" className="min-h-5 text-sm text-success">
        {saved ? `Added ${saved} to your map.` : ""}
      </p>
    </form>
  );
}
