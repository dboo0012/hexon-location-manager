import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { createLocation, createLocations, listLocations } from "../db/locations.js";
import { HttpError } from "../lib/errors.js";
import { extractSingleTextFile, parseLocationText } from "../lib/locationFile.js";
import { locationInputSchema } from "../lib/locationSchema.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.UPLOAD_MAX_BYTES, files: 1 },
});

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

/** Bulk import from a ZIP containing exactly one `Name, Latitude, Longitude` text file. */
locationsRouter.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Attach a .zip file in the "file" field');

  const looksLikeZip = file.buffer.subarray(0, 2).toString("latin1") === "PK";
  if (!file.originalname.toLowerCase().endsWith(".zip") || !looksLikeZip) {
    throw new HttpError(400, "Only .zip files are accepted");
  }

  const { fileName, text } = extractSingleTextFile(file.buffer);
  const inputs = parseLocationText(text);
  const locations = await createLocations(currentUser(req).id, inputs);

  res.status(201).json({ fileName, count: locations.length, locations });
});
