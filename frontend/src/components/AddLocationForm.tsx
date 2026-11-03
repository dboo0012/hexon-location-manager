import { type FormEvent, useState } from "react";
import { useLocationStore } from "../store/locationStore";
import {
  type LocationFormErrors,
  type LocationFormValues,
  validateLocation,
} from "../lib/validateLocation";
import { FormAlert } from "./Alert";
import { FormField } from "./FormField";

const EMPTY: LocationFormValues = { name: "", latitude: "", longitude: "" };

/** Name / latitude / longitude form. `picked` pre-fills coordinates from a map click. */
export function AddLocationForm({ picked }: { picked: { lat: number; lng: number } | null }) {
  const add = useLocationStore((s) => s.add);
  const [values, setValues] = useState<LocationFormValues>(EMPTY);
  const [errors, setErrors] = useState<LocationFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A new map click overwrites the coordinate fields (adjusting state during render, not in an effect).
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
      <p className="text-sm text-ink-soft">Or click the map to fill in the coordinates.</p>
      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? "Adding…" : "Add to map"}
      </button>
      <p role="status" className="min-h-5 text-sm text-success">
        {saved ? `Added ${saved} to your map.` : ""}
      </p>
    </form>
  );
}
