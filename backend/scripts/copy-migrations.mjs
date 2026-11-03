import { cp } from "node:fs/promises";

await cp("src/db/migrations", "dist/db/migrations", { recursive: true });
