import { useAuthStore } from "../store/authStore";
import type { AuthResponse, Location, LocationInput, UploadResponse, User } from "../types";

/** Empty in development (Vite proxies /api); set VITE_API_URL when the API is on another origin. */
const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** Line-level problems reported by the upload endpoint, if any. */
  get lineErrors(): string[] {
    const errors = (this.details as { errors?: unknown } | undefined)?.errors;
    return Array.isArray(errors) ? errors.map(String) : [];
  }
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  formData?: FormData;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.json !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.formData ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string; details?: unknown })
    | null;

  if (!res.ok) {
    // A rejected token means the session is over: sign out so routing sends the user to /login.
    if (res.status === 401 && token) logout();
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details);
  }
  return body as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", json: { email, password } }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", json: { email, password } }),
  me: () => request<{ user: User }>("/api/auth/me"),
  listLocations: () => request<{ locations: Location[] }>("/api/locations"),
  createLocation: (input: LocationInput) =>
    request<{ location: Location }>("/api/locations", { method: "POST", json: input }),
  uploadLocations: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<UploadResponse>("/api/locations/upload", { method: "POST", formData });
  },
};
