import type { LocationInput } from "../lib/locationSchema.js";

export interface User {
  id: number;
  email: string;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

/**
 * Everything the API needs from a database. There are two implementations:
 * - `createPgStore` (PostgreSQL), used by the Node server and the Docker image;
 * - `createD1Store` (Cloudflare D1), used when the API runs as a Cloudflare Worker.
 *
 * Every location query is scoped by `userId`, which always comes from the verified JWT.
 */
export interface Store {
  /** True when the database answers a trivial query. */
  ping(): Promise<boolean>;
  /** Creates a user, or returns null when the email is already registered. */
  createUser(email: string, passwordHash: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<UserWithHash | null>;
  findUserById(id: number): Promise<User | null>;
  /** The user's locations, oldest first. */
  listLocations(userId: number): Promise<Location[]>;
  createLocation(userId: number, input: LocationInput): Promise<Location>;
  /** Inserts all locations atomically (every row or none), returned oldest first. */
  createLocations(userId: number, inputs: LocationInput[]): Promise<Location[]>;
}
