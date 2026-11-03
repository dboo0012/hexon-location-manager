import type { LocationInput } from "../types";

export interface LocationFormValues {
  name: string;
  latitude: string;
  longitude: string;
}

export type LocationFormErrors = Partial<Record<keyof LocationFormValues, string>>;

const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

function coordinate(raw: string, label: string, limit: number): [number | null, string | null] {
  const value = raw.trim();
  if (value === "") return [null, `Enter a ${label.toLowerCase()}.`];
  if (!NUMBER_RE.test(value)) return [null, `${label} must be a decimal number, e.g. 3.1573.`];
  const n = Number(value);
  if (n < -limit || n > limit) return [null, `${label} must be between -${limit} and ${limit}.`];
  return [n, null];
}

/** Validates the add-location form; mirrors the server's rules so most mistakes never leave the browser. */
export function validateLocation(
  values: LocationFormValues,
): { input: LocationInput; errors: null } | { input: null; errors: LocationFormErrors } {
  const errors: LocationFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter a name for this place.";
  else if (name.length > 200) errors.name = "Keep the name under 200 characters.";

  const [latitude, latError] = coordinate(values.latitude, "Latitude", 90);
  const [longitude, lngError] = coordinate(values.longitude, "Longitude", 180);
  if (latError) errors.latitude = latError;
  if (lngError) errors.longitude = lngError;

  if (Object.keys(errors).length > 0) return { input: null, errors };
  return { input: { name, latitude: latitude!, longitude: longitude! }, errors: null };
}

export const formatCoord = (n: number) => n.toFixed(5);
