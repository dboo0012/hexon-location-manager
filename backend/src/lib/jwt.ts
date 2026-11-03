import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthUser {
  id: number;
  email: string;
}

interface TokenPayload {
  sub: string;
  email: string;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = { sub: String(user.id), email: user.email };
  return jwt.sign(payload, config.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

/** Returns the user encoded in a valid token, or null if the token is invalid or expired. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
    const id = Number(decoded.sub);
    if (!Number.isInteger(id) || typeof decoded.email !== "string") return null;
    return { id, email: decoded.email };
  } catch {
    return null;
  }
}
