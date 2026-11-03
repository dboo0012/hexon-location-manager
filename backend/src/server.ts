import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { pool } from "./db/pool.js";

async function main() {
  await migrate(pool, (msg) => console.log(msg));

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`API listening on http://localhost:${config.PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
