// Regenerates the example upload files in ../samples. Run with: npm run samples
import AdmZip from "adm-zip";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../samples");

const VALID = `Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
Batu Caves,3.2379,101.6840
Merdeka Square,3.1478,101.6953
KL Tower,3.1528,101.7039
Petaling Street,3.1440,101.6977
Thean Hou Temple,3.1218,101.6872
Perdana Botanical Garden,3.1430,101.6844
`;

const BAD_ROWS = `Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Somewhere,not-a-number,101.7
Too far north,95.5,101.7
Missing longitude,3.1
`;

const samples = {
  "valid-locations.zip": { "locations.txt": VALID },
  "invalid-two-files.zip": { "locations.txt": VALID, "more-locations.txt": VALID },
  "invalid-text-and-image.zip": { "locations.txt": VALID, "photo.png": "not really a png" },
  "invalid-csv-not-txt.zip": { "locations.csv": VALID },
  "invalid-bad-rows.zip": { "locations.txt": BAD_ROWS },
  "invalid-empty.zip": {},
};

await mkdir(OUT, { recursive: true });
for (const [zipName, files] of Object.entries(samples)) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) zip.addFile(name, Buffer.from(content));
  await writeFile(path.join(OUT, zipName), zip.toBuffer());
  console.log(`wrote samples/${zipName}`);
}
await writeFile(path.join(OUT, "locations.txt"), VALID);
console.log("wrote samples/locations.txt");
