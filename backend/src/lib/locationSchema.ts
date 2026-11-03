import { z } from "zod";

export const NAME_MAX = 200;

/** Accepts numbers or numeric strings (form inputs often send strings). */
const coordinate = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z
      .number({ error: `${label} must be a number` })
      .refine(Number.isFinite, `${label} must be a number`)
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`),
  );

export const locationInputSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  latitude: coordinate("Latitude", -90, 90),
  longitude: coordinate("Longitude", -180, 180),
});

export type LocationInput = z.infer<typeof locationInputSchema>;
