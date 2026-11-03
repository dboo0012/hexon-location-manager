import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors.js";
import { type AuthUser, verifyToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Rejects the request with 401 unless it carries a valid `Authorization: Bearer <jwt>` header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Authentication required"));
  }
  const user = verifyToken(token);
  if (!user) {
    return next(new HttpError(401, "Invalid or expired token"));
  }
  req.user = user;
  next();
}

/** The authenticated user. Only call from handlers mounted behind `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}
