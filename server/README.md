# Carewell API

The API uses Express with PostgreSQL and Neon Object Storage. Neon resources are declared in the project-root
`neon.ts`; `neon deploy` writes connection values to the ignored project-root `.env.local` file.

Install the server dependencies with `npm install --prefix server`, then run `npm start` from the project root. The
API listens on `http://localhost:3000` and exposes `GET /api/v1/health`. The health response reports service status
only; it never returns credentials or connection details.

Run `npm run verify:services` from the project root to query Postgres and verify object storage with a temporary
upload, download, and delete. Storage operations are kept server-side; do not expose the Neon S3 credentials to the
browser. The bucket is private, so authenticated attachment routes should be added alongside the API's session and
authorization middleware.

The full API contract and implementation guidance are in [`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) and
[`../docs/BACKEND_GUIDE.md`](../docs/BACKEND_GUIDE.md).
