// Cloudflare Worker entrypoint: the same Express app as the Node server, backed by D1.
// Static frontend files are served by Workers Assets before this code runs (see wrangler.jsonc).
import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";
import { createApp } from "./app.js";
import { createD1Store } from "./db/d1Store.js";

const PORT = 8080;

createApp(createD1Store(env.DB)).listen(PORT);

export default httpServerHandler({ port: PORT });
