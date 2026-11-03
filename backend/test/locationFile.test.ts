import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { HttpError } from "../src/lib/errors.js";
import { extractSingleTextFile, parseLocationText } from "../src/lib/locationFile.js";

function zipOf(files: Record<string, string | Buffer | null>): Buffer {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    if (content === null) zip.addFile(name.endsWith("/") ? name : `${name}/`, Buffer.alloc(0));
    else zip.addFile(name, Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"));
  }
  return zip.toBuffer();
}

function errorOf(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (err) {
    if (err instanceof HttpError) return err;
    throw err;
  }
  throw new Error("expected function to throw");
}

const SAMPLE = `Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
`;

describe("parseLocationText", () => {
  it("parses the sample from the brief", () => {
    expect(parseLocationText(SAMPLE)).toEqual([
      { name: "Suria KLCC", latitude: 3.157324409, longitude: 101.7121981 },
      { name: "Zoo Negara", latitude: 3.2105416, longitude: 101.75920504 },
    ]);
  });

  it("works without a header, with CRLF, blank lines and extra spaces", () => {
    const text = "\r\n  Suria KLCC , 3.15 , 101.71 \r\n\r\nZoo Negara,3.21,101.75\r\n";
    expect(parseLocationText(text)).toEqual([
      { name: "Suria KLCC", latitude: 3.15, longitude: 101.71 },
      { name: "Zoo Negara", latitude: 3.21, longitude: 101.75 },
    ]);
  });

  it.each(["Name,Latitude,Longitude", "name, lat, lng", '"Name","Latitude","Longitude"'])(
    "recognises header variant %s",
    (header) => {
      expect(parseLocationText(`${header}\nA,1,2`)).toEqual([
        { name: "A", latitude: 1, longitude: 2 },
      ]);
    },
  );

  it("allows commas and quotes in names", () => {
    expect(parseLocationText('Petronas Towers, KLCC,3.1,101.7\n"Bukit Bintang, KL",3.14,101.71')).toEqual([
      { name: "Petronas Towers, KLCC", latitude: 3.1, longitude: 101.7 },
      { name: "Bukit Bintang, KL", latitude: 3.14, longitude: 101.71 },
    ]);
  });

  it("accepts negative and boundary coordinates", () => {
    expect(parseLocationText("South Pole,-90,0\nDateline,0,-180\nNorth,90,180")).toHaveLength(3);
  });

  it("reports every invalid line with its line number", () => {
    const err = errorOf(() =>
      parseLocationText("Name,Latitude,Longitude\nOK,1,2\nBad lat,abc,2\nOut,95,2\nShort,1\n,1,2"),
    );
    expect(err.status).toBe(400);
    expect(err.message).toMatch(/4 invalid lines/);
    expect((err.details as { errors: string[] }).errors).toEqual([
      'Line 3: latitude "abc" is not a number',
      "Line 4: Latitude must be between -90 and 90",
      'Line 5: expected "Name, Latitude, Longitude"',
      "Line 6: Name is required",
    ]);
  });

  it.each(["0x10", "1e", "", "1.2.3", "Infinity", "NaN"])("rejects non-decimal number %j", (v) => {
    expect(() => parseLocationText(`A,${v},1`)).toThrow(HttpError);
  });

  it("rejects a file with only a header", () => {
    expect(errorOf(() => parseLocationText("Name, Latitude, Longitude\n\n")).message).toMatch(
      /does not contain any locations/,
    );
  });

  it("rejects an empty file", () => {
    expect(() => parseLocationText("")).toThrow(/does not contain any locations/);
  });
});

describe("extractSingleTextFile", () => {
  it("extracts a single .txt file", () => {
    const { fileName, text } = extractSingleTextFile(zipOf({ "locations.txt": SAMPLE }));
    expect(fileName).toBe("locations.txt");
    expect(text).toBe(SAMPLE);
  });

  it("accepts a .txt file inside a folder and ignores directory entries", () => {
    const { fileName } = extractSingleTextFile(zipOf({ "data/": null, "data/places.TXT": SAMPLE }));
    expect(fileName).toBe("places.TXT");
  });

  it("strips a UTF-8 BOM", () => {
    const { text } = extractSingleTextFile(zipOf({ "a.txt": `﻿${SAMPLE}` }));
    expect(text.startsWith("Name")).toBe(true);
  });

  it("rejects a ZIP with two text files", () => {
    const err = errorOf(() => extractSingleTextFile(zipOf({ "a.txt": SAMPLE, "b.txt": SAMPLE })));
    expect(err.message).toMatch(/exactly one .txt file, but it contains 2 files/);
  });

  it("rejects a ZIP with a text file plus something else", () => {
    expect(() => extractSingleTextFile(zipOf({ "a.txt": SAMPLE, "image.png": "x" }))).toThrow(
      /contains 2 files/,
    );
  });

  it("rejects a ZIP whose only file is not .txt", () => {
    expect(() => extractSingleTextFile(zipOf({ "locations.csv": SAMPLE }))).toThrow(
      /must contain a .txt file, but it contains "locations.csv"/,
    );
  });

  it("rejects an empty ZIP", () => {
    expect(() => extractSingleTextFile(zipOf({}))).toThrow(/ZIP file is empty/);
  });

  it("rejects a ZIP containing only folders", () => {
    expect(() => extractSingleTextFile(zipOf({ "folder/": null }))).toThrow(/ZIP file is empty/);
  });

  it("rejects a .txt file with binary content", () => {
    expect(() =>
      extractSingleTextFile(zipOf({ "a.txt": Buffer.from([0x50, 0x00, 0x01, 0x02]) })),
    ).toThrow(/not a plain text file/);
  });

  it("rejects data that is not a ZIP", () => {
    expect(() => extractSingleTextFile(Buffer.from("hello world"))).toThrow(/not a valid ZIP/);
  });
});
