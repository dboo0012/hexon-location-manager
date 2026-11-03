import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
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

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
}

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so login timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email`,
    [email, passwordHash],
  );
  const user = result.rows[0];
  if (!user) throw new HttpError(409, "An account with this email already exists");

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await pool.query<UserRow>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password");

  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { id } = currentUser(req);
  const { rows } = await pool.query<UserRow>("SELECT id, email FROM users WHERE id = $1", [id]);
  // The token is valid but the account no longer exists.
  if (!rows[0]) throw new HttpError(401, "Account not found");
  res.json({ user: rows[0] });
});
