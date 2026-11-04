import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import type { Store } from "../db/store.js";
import { HttpError } from "../lib/errors.js";
import { signToken } from "../lib/jwt.js";
import { currentUser, requireAuth } from "../middleware/requireAuth.js";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so login timing does not reveal which emails exist.
// A precomputed hash (same cost) of a discarded random password: Cloudflare Workers forbid
// generating random salts at startup, so it cannot be computed when the module loads.
const DUMMY_HASH = "$2b$10$3wDGAnpYEgFVSRfEY158DuexBzU/fpuSegnDqdmxTKLCYibzjw57a";

/** Register, log in, and "who am I" endpoints. */
export function createAuthRouter(store: Store) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { email, password } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await store.createUser(email, passwordHash);
    if (!user) throw new HttpError(409, "An account with this email already exists");

    res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await store.findUserByEmail(email);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, "Invalid email or password");

    res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
  });

  router.get("/me", requireAuth, async (req, res) => {
    const user = await store.findUserById(currentUser(req).id);
    // The token is valid but the account no longer exists.
    if (!user) throw new HttpError(401, "Account not found");
    res.json({ user: { id: user.id, email: user.email } });
  });

  return router;
}
