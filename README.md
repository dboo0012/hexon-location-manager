# Waypoints: Location Manager

A full-stack web app where each user keeps a private map of places. Add a place by typing its
name and coordinates, or upload a ZIP with a whole list of them, and see every place as a
clickable marker on an interactive map.

Built for the Hexon *Full Stack Location Management Application* technical assessment.

| Area | Choice |
|---|---|
| Frontend | React 19 + Vite, TypeScript, Tailwind CSS v4, react-router, Zustand |
| Map | react-leaflet (Leaflet) with OpenStreetMap tiles |
| Backend | Node.js + Express 5, TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT (HS256) with bcrypt-hashed passwords |
| Tests | Vitest + Supertest (API, real Postgres), Vitest + Testing Library (UI), Playwright (end to end) |
| Bonus | Dockerized backend (multi-stage image) and `docker compose` for API + database |

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Running without Docker](#running-the-backend-without-docker)
- [Configuration](#configuration)
- [Using the app](#using-the-app)
- [Upload file format](#upload-file-format)
- [API reference](#api-reference)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)

## Features

**Pages and navigation**
- Four pages: **Register**, **Login**, **Map** and **Upload**.
- Sidebar with Map, Upload, the signed-in email and **Log out**. On small screens it becomes a menu.

**Authentication and privacy**
- JWT authentication. Map and Upload are protected, and signed-out visitors are redirected to
  Login. After signing in they return to the page they asked for.
- Every location belongs to one user. The user id always comes from the verified token, never
  from the request body, so user B can never read or write user A's places.
- Expired or rejected tokens sign the user out automatically.

**Interactive map**
- Form for name, latitude and longitude. It validates input in the browser and again on the server.
- A new place appears as a marker immediately, without a page reload, and the map flies to it.
- Clicking a marker shows the place's name (and its coordinates).
- Extras: click the map to fill in the coordinates, and a list of your places that jumps to each one.

**File upload**
- Upload a `.zip` that contains exactly one `.txt` file.
- Success shows a confirmation popup for **3 seconds**, then all places are added to the map.
- Anything else shows an error popup for **3 seconds**, for example several files, a non-`.txt` file, an empty or corrupt ZIP, or a non-ZIP file. Malformed rows are reported with line numbers, and nothing is saved.

## Quick start

**Prerequisites:** Node.js 20.19+ (22 LTS recommended), npm, and Docker Desktop (or Docker Engine
with Compose).

```bash
git clone https://github.com/dboo0012/hexon-location-manager.git
cd hexon-location-manager

# 1. Start PostgreSQL and the API (http://localhost:4000)
docker compose up -d --build

# 2. Start the frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>, create an account, and start adding places. Try the files in
[`samples/`](samples) on the Upload page.

The API runs its database migrations on start-up, so there is no separate setup step. Check it
with `curl http://localhost:4000/api/health`, which should return `{"status":"ok","database":"up"}`.

To stop everything, run `docker compose down`. Add `-v` to also delete the database volume.

## Running the backend without Docker

If you prefer to run the API with Node directly, you still need a PostgreSQL database. The
simplest option is to start only the database container:

```bash
docker compose up -d db          # PostgreSQL on localhost:5432

cd backend
cp .env.example .env             # defaults match docker-compose.yml
npm install
npm run dev                      # API with auto-reload on http://localhost:4000
```

To use your own PostgreSQL instead, create a database and set `DATABASE_URL` in `backend/.env`.

## Configuration

Backend (`backend/.env`, see [`backend/.env.example`](backend/.env.example)):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | none (required) | PostgreSQL connection string |
| `JWT_SECRET` | none (required, at least 16 chars) | Secret used to sign tokens. Use a long random value outside development |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (`1h`, `7d`, …) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin(s), comma-separated |
| `UPLOAD_MAX_BYTES` | `5242880` | Maximum upload size (5 MB) |

With Docker Compose, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `API_PORT` and `DB_PORT` can
be overridden from your shell or a root `.env` file.

Frontend (`frontend/.env`, optional, see [`frontend/.env.example`](frontend/.env.example)):

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | empty | API origin. Leave it empty in development, because Vite proxies `/api` |
| `VITE_PROXY_TARGET` | `http://localhost:4000` | Where the dev-server proxy forwards `/api` |

## Using the app

1. **Register** with an email and a password of at least 8 characters. You are signed in and taken to the map.
2. On the **Map**, enter a name, latitude and longitude (for example `Suria KLCC`, `3.157324409`,
   `101.7121981`) and press **Add to map**. The marker appears straight away; click it to see the name.
   You can also click anywhere on the map to fill in the coordinates.
3. On **Upload file**, choose or drop a `.zip` and press **Upload and add to map**.
4. Use **Log out** in the sidebar. Sign in as a different user and you will see only that user's places.

## Upload file format

The ZIP must contain exactly **one** `.txt` file and nothing else. Folder entries are ignored,
so a text file inside a folder is fine. Each line holds a name, a latitude and a longitude,
separated by commas:

```text
Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
```

- The header line is optional. Blank lines are skipped, and spaces around values are trimmed.
- The last two fields are the coordinates, so a name may contain commas (`Bukit Bintang, KL,3.14,101.71`).
  Names may also be wrapped in double quotes.
- Latitude must be between -90 and 90, and longitude between -180 and 180, written as plain decimals.
- If any line is invalid, the whole file is rejected and the error lists the offending line numbers.
- Limits: 5 MB upload, 10 MB uncompressed text, 10,000 places per file.

Sample files for every case are in [`samples/`](samples) (regenerate them with `npm run samples` in `backend/`).

## API reference

All endpoints are under `/api`. Errors are returned as `{ "error": "message", "details"?: … }`.
Protected endpoints require `Authorization: Bearer <token>`.

| Method | Path | Auth | Request | Success response |
|---|---|---|---|---|
| `GET` | `/api/health` | none | none | `200 { status, database }` |
| `POST` | `/api/auth/register` | none | `{ email, password }` | `201 { token, user }` |
| `POST` | `/api/auth/login` | none | `{ email, password }` | `200 { token, user }` |
| `GET` | `/api/auth/me` | ✔ | none | `200 { user }` |
| `GET` | `/api/locations` | ✔ | none | `200 { locations: Location[] }` |
| `POST` | `/api/locations` | ✔ | `{ name, latitude, longitude }` | `201 { location }` |
| `POST` | `/api/locations/upload` | ✔ | `multipart/form-data`, field `file` (.zip) | `201 { fileName, count, locations }` |

`Location` is `{ id, name, latitude, longitude, createdAt }`.

Status codes: `400` for invalid input or upload, `401` when unauthenticated or the token is
invalid or expired, `409` when the email is already registered, `413` when the body is too large.

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}' | jq -r .token)

curl -s -X POST localhost:4000/api/locations -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Suria KLCC","latitude":3.157324409,"longitude":101.7121981}'

curl -s -X POST localhost:4000/api/locations/upload -H "Authorization: Bearer $TOKEN" \
  -F file=@samples/valid-locations.zip
```

## Testing

All test suites need the database running: `docker compose up -d db`. The backend tests use a
separate `hexon_locations_test` database, which the container creates on first start.

```bash
# Backend: API integration tests against real PostgreSQL + unit tests for the file parser
cd backend && npm test

# Frontend: component and store tests (jsdom; react-leaflet is stubbed)
cd frontend && npm test

# End to end: the real app in Chromium (desktop + mobile viewport)
docker compose up -d --build     # API + DB
cd frontend && npx playwright install chromium   # first time only
npm run test:e2e                 # starts the Vite dev server if needed
```

The end-to-end suite walks through every requirement in the brief:
- redirects for signed-out users;
- register, log out and log back in;
- instant markers with no reload, and name popups;
- two-user isolation (A adds five places, B sees none);
- the 3-second success and error popups for every sample ZIP;
- the mobile menu.

Type-checking and linting: `npm run typecheck` (backend), `npm run build` / `npm run lint` (frontend).

## Project structure

```
.
├── docker-compose.yml        PostgreSQL + API
├── samples/                  example upload files (valid + each error case)
├── backend/
│   ├── Dockerfile            multi-stage build → small runtime image
│   ├── db-init/              creates the test database on first DB start
│   ├── scripts/              build helper, sample generator
│   ├── src/
│   │   ├── app.ts            Express app (middleware, routes, error handling)
│   │   ├── server.ts         runs migrations, starts listening, graceful shutdown
│   │   ├── config.ts         validated environment variables
│   │   ├── db/               pg pool, migration runner, SQL migrations, location queries
│   │   ├── lib/              JWT helpers, ZIP/text parsing, validation schemas, HttpError
│   │   ├── middleware/       requireAuth, error handler
│   │   └── routes/           /api/auth, /api/locations
│   └── test/                 Vitest + Supertest suites
└── frontend/
    ├── e2e/                  Playwright end-to-end tests
    └── src/
        ├── components/       layout, route guards, map, forms, timed popup
        ├── pages/            Login, Register, Map, Upload (+ tests)
        ├── store/            Zustand stores: auth (persisted), locations
        └── lib/              API client, validation, Leaflet setup
```

## Design decisions

- **Per-user scoping lives in one place.** Every location query takes the user id from the
  verified JWT (`requireAuth` puts it on `req.user`). The request body can't override it, and a
  test checks that.
- **Uploads are all-or-nothing.** The ZIP is checked before parsing. All rows are validated
  first, then inserted in a single transaction with one multi-row `INSERT … SELECT unnest(…)`.
  A half-imported file would be harder to fix than a clear list of bad lines.
- **When the upload's places appear.** The server saves them immediately. The browser shows the
  confirmation for 3 seconds, then merges the returned places into the map state and opens the
  map, which matches the brief's "popup for three seconds, then automatically add". If the user
  leaves the page during the popup, the places are still added.
- **Strict ZIP rules, lenient text.** The ZIP must hold exactly one `.txt` file. Inside that
  file the parser tolerates the usual real-world variations: an optional header, CRLF line
  endings, a BOM, extra spaces, quoted names and commas in names.
- **Defence in depth on coordinates.** They are validated in the browser, in the API (zod) and
  by `CHECK` constraints in PostgreSQL.
- **Raw SQL and a tiny migration runner instead of an ORM.** With two tables, plain SQL keeps
  the privacy-critical queries easy to review. Migrations run on boot behind an advisory lock.
- **Vite SPA rather than Next.js.** The brief calls for a separate Express API, so a client-only
  app keeps a single server layer.
- **Login doesn't reveal which emails exist.** Unknown emails and wrong passwords return the
  same message, and unknown emails are still compared against a dummy bcrypt hash so the timing
  matches.
- **Map tiles.** Standard OpenStreetMap tiles need no API key, which keeps setup to one command.
