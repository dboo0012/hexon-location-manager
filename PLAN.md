# Implementation Plan — Full Stack Location Management App

Source brief: *Hexon Technical Assessments*, pages 1–2 ("Full Stack Location Management Application").

This file is the living checklist the implementation loop works from. Each loop iteration picks the
first unchecked task, implements it, verifies it (tests / build / running app), ticks it off, commits
and pushes. Notes about decisions go in the **Decisions** section at the bottom.

## Requirements (from the brief)

- Four pages: **Register**, **Login**, **Map**, **Upload**. Sidebar navigation with **Logout**.
- JWT auth. Map and Upload are protected; unauthenticated visitors are redirected to Login.
- Locations are per-user: user B never sees user A's markers.
- Map uses **react-leaflet**. Form with name / latitude / longitude; on submit the marker appears
  instantly (no reload). Clicking a marker shows its name.
- Upload a single **ZIP** containing **exactly one .txt** file in the format below.
  - Success → confirmation popup for **3 seconds**, then all locations are added to the user's map.
  - ZIP containing anything other than a single text file → error popup for **3 seconds**.
  ```
  Name, Latitude, Longitude
  Suria KLCC,3.157324409,101.7121981
  Zoo Negara,3.21054160,101.75920504
  ```
- Stack: React (Vite) + Tailwind CSS, Node + Express, PostgreSQL, JWT, react-leaflet, Zustand, TypeScript.
- Deliverables: GitHub repo, comprehensive README, bonus Dockerized backend.

## Architecture

```
hexon-location-manager/
├─ backend/            Express + TypeScript API
│  ├─ src/
│  │  ├─ app.ts            express app factory (used by server + tests)
│  │  ├─ server.ts         listen + run migrations on boot
│  │  ├─ config.ts         env parsing (zod)
│  │  ├─ db/               pg Pool, migrate runner, migrations/*.sql
│  │  ├─ middleware/       requireAuth (JWT), error handler
│  │  ├─ routes/           auth.ts, locations.ts
│  │  └─ lib/              locationFile.ts (ZIP + txt parsing), validation schemas
│  ├─ test/            vitest + supertest against a real Postgres (docker compose)
│  └─ Dockerfile
├─ frontend/           Vite + React + TS + Tailwind v4 + react-leaflet + zustand + react-router
├─ samples/            example ZIPs (valid, multiple files, non-txt, malformed rows)
└─ docker-compose.yml  postgres + backend
```

### API

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{ email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | – | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | JWT | → `{ user }` |
| GET | `/api/locations` | JWT | → `{ locations: [...] }` (only the caller's) |
| POST | `/api/locations` | JWT | `{ name, latitude, longitude }` → `{ location }` |
| POST | `/api/locations/upload` | JWT | multipart `file` (.zip) → `{ locations: [...], count }` |
| GET | `/api/health` | – | liveness + DB check |

### Data model

- `users(id serial pk, email citext unique, password_hash text, created_at)`
- `locations(id serial pk, user_id int fk → users on delete cascade, name text, latitude double precision check -90..90, longitude double precision check -180..180, created_at)`, index on `user_id`.

Every location query filters by `user_id = req.user.id` taken from the verified JWT — never from the request body.

## Tasks

### Backend
- [x] **B1 Scaffold** — root `.gitignore`, `docker-compose.yml` (postgres 16 on 5432 with healthcheck), `backend/` package (TS, express, tsx, vitest), `.env.example`.
- [x] **B2 DB layer** — pg Pool, SQL migrations runner (`schema_migrations` table), `001_init.sql`; runs on server boot and in tests.
- [x] **B3 Auth** — register/login/me, bcryptjs hashing, JWT (HS256, configurable expiry), `requireAuth` middleware, zod validation, central error handler. Tests: register, duplicate email 409, bad login 401, missing/invalid token 401.
- [x] **B4 Locations CRUD** — GET/POST scoped by user. Tests incl. **user isolation** (A adds 5, B sees 0) and coordinate validation.
- [x] **B5 ZIP upload** — multer memory storage (size limit), validate ZIP has exactly one file entry and it is `.txt` (directory-only entries ignored), parse rows (optional header, trims, name may contain commas → last two fields are coords), validate ranges, insert in one transaction. Unit tests for the parser + integration tests for valid / multi-file / non-txt / not-a-zip / malformed rows / empty file.
- [x] **B6 Docker** — multi-stage `backend/Dockerfile`, compose `backend` service depending on healthy postgres; verify `docker compose up` serves `/api/health`.

### Frontend
- [x] **F1 Scaffold** — Vite React TS, Tailwind v4, react-router, zustand, react-leaflet + leaflet CSS + marker icon fix, API client with bearer token + 401 → logout.
- [x] **F2 Auth pages** — Register + Login forms with validation/error display; auth store persisted to localStorage; `ProtectedRoute` redirects to `/login` (and back after login); logged-in users visiting `/login` go to `/map`.
- [x] **F3 Layout** — sidebar (Map, Upload, user email, Logout), responsive (collapsible on mobile).
- [x] **F4 Map page** — load user's locations, form (name/lat/lng) with validation, optimistic-free instant add from POST response, markers with Popup showing name, fly to new marker, list of locations.
- [ ] **F5 Upload page** — drag & drop / picker for `.zip`, client-side extension check, success modal 3 s then locations merged into store, error modal 3 s with the server's message.

### Wrap-up
- [ ] **W1 Samples** — `samples/` with valid ZIP, multi-file ZIP, non-txt ZIP, malformed ZIP + a script that regenerates them.
- [ ] **W2 End-to-end check** — run the full stack, exercise every requirement in a browser (two users, isolation, upload success + error popups timing), fix what breaks.
- [ ] **W3 README** — overview, stack, prerequisites, quick start (docker compose + dev servers), env vars, API reference, upload format, testing, project structure, design decisions.

## Decisions

- **Vite SPA over Next.js**: the brief needs a pure client app talking to a separate Express API; Next would duplicate the server layer.
- **Raw SQL + tiny migration runner over an ORM**: two tables; keeps the data-scoping logic visible to reviewers.
- **Upload is persisted server-side immediately**; the frontend waits for the 3 s confirmation popup to close, then merges the returned locations into the map store (matches "popup for three seconds, then automatically add").
- **Bad rows reject the whole upload** (400 with line numbers) rather than partially importing — predictable for the user.
