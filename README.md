# Carewell

Find trusted doctors, request appointments, and coordinate care. A PERN-stack platform
(**P**ostgreSQL · **E**xpress · **R**eact · **N**ode).

| Part | Status |
| --- | --- |
| [`client/`](client) – React web app (patients, doctors, administrators) | ✅ Built. Runs on an in-memory demo, ready to switch to the API. |
| [`server/`](server) – Express + PostgreSQL API | ⏳ Not started. See [docs/BACKEND_GUIDE.md](docs/BACKEND_GUIDE.md). |
| [`docs/`](docs) – API contract, data model, architecture | ✅ Written for the backend team. |

## Quick start (client, demo mode)

Requires Node.js 20.19+ or 22.12+.

```sh
cd client
npm install
npm run dev          # http://localhost:5173/Doctor-platform/
```

Demo mode uses fictional data that resets on reload. Any email and password signs in: choose **Doctor sign in** or
**Administrator sign in** from the sidebar.

## Scripts (run in `client/`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (proxies `/api` to the backend) |
| `npm run build` / `npm run preview` | Production build / serve it locally |
| `npm test` | Unit and integration tests (Vitest + Testing Library) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run check` | Lint + format check + tests + build (what CI runs) |

## Connecting a backend

1. Build the API from [docs/API_CONTRACT.md](docs/API_CONTRACT.md) (schema proposal in
   [docs/DATA_MODEL.md](docs/DATA_MODEL.md)).
2. In `client/`, copy `.env.example` to `.env.local` and set `VITE_CAREWELL_DATA_MODE=api`.
3. Run the API on `http://localhost:3000` (or set `VITE_DEV_PROXY_TARGET`); the Vite dev server proxies `/api/*`.

API failures are shown to the user and never silently fall back to demo data.

## Repository layout

```text
client/   React app (see docs/ARCHITECTURE.md)
server/   Express API (to be built)
docs/     Contracts and guides
.github/  CI and GitHub Pages deployment
```

## Contributing

- Follow the conventions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Run `npm run check` in `client/` before opening a pull request.
- Keep the API contract and the demo adapter in sync: the demo tests are the executable specification.
