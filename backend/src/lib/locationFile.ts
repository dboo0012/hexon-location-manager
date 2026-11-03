import AdmZip from "adm-zip";
import { HttpError } from "./errors.js";
import { type LocationInput, locationInputSchema } from "./locationSchema.js";

export const MAX_ROWS = 10_000;
/** Upper bound on the uncompressed size of the text file (guards against zip bombs). */
export const MAX_TEXT_BYTES = 10 * 1024 * 1024;
const MAX_REPORTED_ERRORS = 10;

const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const HEADER_RE = /^\s*"?name"?\s*,\s*"?lat(itude)?"?\s*,\s*"?(lng|lon|long|longitude)"?\s*$/i;

const bad = (message: string, details?: unknown) => new HttpError(400, message, details);

/**
 * Extracts the single text file from a ZIP archive.
 * Directory entries are ignored; any other content (zero files, several files, or a non-.txt
 * file) is rejected, as required by the brief.
 */
export function extractSingleTextFile(zipBuffer: Buffer): { fileName: string; text: string } {
  let zip: AdmZip;
  let entries: AdmZip.IZipEntry[];
  try {
    zip = new AdmZip(zipBuffer);
    entries = zip.getEntries();
  } catch {
    throw bad("The uploaded file is not a valid ZIP archive");
  }

  const files = entries.filter((e) => !e.isDirectory);
  if (files.length === 0) {
    throw bad("The ZIP file is empty. It must contain exactly one .txt file");
  }
  if (files.length > 1) {
    throw bad(
      `The ZIP file must contain exactly one .txt file, but it contains ${files.length} files`,
      { files: files.slice(0, 20).map((f) => f.entryName) },
    );
  }

  const entry = files[0]!;
  const fileName = entry.entryName.split("/").pop() ?? entry.entryName;
  if (!fileName.toLowerCase().endsWith(".txt")) {
    throw bad(`The ZIP file must contain a .txt file, but it contains "${fileName}"`);
  }
  if (entry.header.size > MAX_TEXT_BYTES) {
    throw bad("The text file inside the ZIP is too large");
  }

  let data: Buffer;
  try {
    data = entry.getData();
  } catch {
    throw bad("The text file inside the ZIP could not be read (is the archive encrypted?)");
  }
  if (data.includes(0)) {
    throw bad(`"${fileName}" is not a plain text file`);
  }

  // Strip a UTF-8 byte-order mark if present.
  const text = data.toString("utf8").replace(/^﻿/, "");
  return { fileName, text };
}

/**
 * Parses `Name, Latitude, Longitude` lines. A header line is optional and blank lines are
 * skipped. The last two fields are the coordinates, so names may themselves contain commas.
 * Any invalid row rejects the whole file, with line numbers in the error details.
 */
export function parseLocationText(text: string): LocationInput[] {
  const lines = text.split(/\r\n|\r|\n/);
  const locations: LocationInput[] = [];
  const errors: string[] = [];
  let seenContent = false;

  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (line === "") return;

    if (!seenContent) {
      seenContent = true;
      if (HEADER_RE.test(line)) return;
    }

    const parts = line.split(",");
    if (parts.length < 3) {
      errors.push(`Line ${lineNo}: expected "Name, Latitude, Longitude"`);
      return;
    }
    const lngRaw = parts.pop()!.trim();
    const latRaw = parts.pop()!.trim();
    const name = unquote(parts.join(",").trim());

    if (!NUMBER_RE.test(latRaw)) {
      errors.push(`Line ${lineNo}: latitude "${latRaw}" is not a number`);
      return;
    }
    if (!NUMBER_RE.test(lngRaw)) {
      errors.push(`Line ${lineNo}: longitude "${lngRaw}" is not a number`);
      return;
    }

    const result = locationInputSchema.safeParse({
      name,
      latitude: Number(latRaw),
      longitude: Number(lngRaw),
    });
    if (!result.success) {
      errors.push(`Line ${lineNo}: ${result.error.issues[0]?.message ?? "invalid row"}`);
      return;
    }
    locations.push(result.data);
  });

  if (errors.length > 0) {
    const more = errors.length - MAX_REPORTED_ERRORS;
    throw bad(
      `The file has ${errors.length} invalid line${errors.length === 1 ? "" : "s"}. ${errors[0]}`,
      { errors: errors.slice(0, MAX_REPORTED_ERRORS).concat(more > 0 ? [`...and ${more} more`] : []) },
    );
  }
  if (locations.length === 0) {
    throw bad("The text file does not contain any locations");
  }
  if (locations.length > MAX_ROWS) {
    throw bad(`The text file contains more than ${MAX_ROWS} locations`);
  }
  return locations;
}

function unquote(value: string): string {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replace(/""/g, '"').trim()
    : value;
}
