# Carewell

Find trusted doctors, request appointments, and coordinate care. A PERN-stack platform
(**P**ostgreSQL · **E**xpress · **R**eact · **N**ode).

| Part | Status |
| --- | --- |
| [`client/`](client) – React web app (patients, doctors, administrators) | Built. Runs on an in-memory demo, or on the API when the backend is present. |
| [`server/`](server) – Express + PostgreSQL API | Built in stages: administrator API and core accounts first, then booking and doctor workspace, then messaging, support and doctor onboarding. See [docs/BACKEND_GUIDE.md](docs/BACKEND_GUIDE.md). |
| [`docs/`](docs) – API contract, data model, architecture | Written for the whole team. |

## Quick start (client only, demo mode)

Requires Node.js 20.19+ or 22.12+.

```sh
cd client
npm install
npm run dev          # http://localhost:5173/Doctor-platform/
```

Demo mode uses fictional data that resets on reload. Any email and password signs in: choose **Doctor sign in** or
**Administrator sign in** from the sidebar.

## Run the whole app (client + server + database)

Needs the `server/` folder (it arrives with the backend branch) and a PostgreSQL database such as Neon.

1. Copy `.env.example` to `.env.local` in the **repository root** and fill in the database, storage and email values.
2. Install and prepare the API:
   ```sh
   cd server
   npm install
   npx prisma migrate deploy      # creates the tables
   npm run seed                   # first administrator, specialties, clinics
   npm run dev                    # API on http://localhost:3000
   ```
3. In `client/`, copy `.env.example` to `.env.local` and set `VITE_CAREWELL_DATA_MODE=api`, then `npm run dev`.
4. Sign in as the administrator with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env.local`.

`npm test` in `server/` runs the API tests inside a temporary schema of your database; real data is never touched.
API failures are shown to the user and never silently fall back to demo data.

## Scripts (run in `client/`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (proxies `/api` to the backend) |
| `npm run build` / `npm run preview` | Production build / serve it locally |
| `npm test` | Unit and integration tests (Vitest + Testing Library) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run check` | Lint + format check + tests + build (what CI runs) |

## Repository layout

```text
client/   React app (see docs/ARCHITECTURE.md)
server/   Express API (routes, Prisma schema, tests)
docs/     Contracts and guides
.github/  CI and GitHub Pages deployment
```

## Credits

- **Design and original frontend:** Tahiya Zareen Hiya, Wasikul Fahim and AfsaraTasnimRoza (see the Git history of
  `main` for the exact commits).
- **Frontend restructure, API layer, backend and database schema:** Adullah al Jubayer.
- **Backend parts for booking/doctor workspace and for messaging/support/doctor onboarding:** the teammates who
  deliver them, in their own commits.

Credit follows the Git history: please merge with merge commits, never squash, so every author's commits stay visible.

## Contributing

- Follow the conventions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Run `npm run check` in `client/` before opening a pull request.
- Keep the API contract and the demo adapter in sync: the demo tests are the executable specification.
