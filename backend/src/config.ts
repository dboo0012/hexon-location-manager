import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Required by the Node server (PostgreSQL). The Cloudflare Worker uses its D1 binding instead.
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  // Throwing (rather than process.exit) also fails a Cloudflare Worker loudly at startup.
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const config = parsed.data;
