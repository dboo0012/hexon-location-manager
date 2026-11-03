import { Router } from "express";
import { createLocation, listLocations } from "../db/locations.js";
import { locationInputSchema } from "../lib/locationSchema.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";

export const locationsRouter = Router();

locationsRouter.use(requireAuth);

locationsRouter.get("/", async (req, res) => {
  const locations = await listLocations(currentUser(req).id);
  res.json({ locations });
});

locationsRouter.post("/", async (req, res) => {
  const input = locationInputSchema.parse(req.body ?? {});
  const location = await createLocation(currentUser(req).id, input);
  res.status(201).json({ location });
});
