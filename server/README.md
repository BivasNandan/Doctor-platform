# Carewell API (to be built)

This folder is reserved for the Express + PostgreSQL backend. Nothing is implemented yet.

Start with [`../docs/BACKEND_GUIDE.md`](../docs/BACKEND_GUIDE.md), which covers the suggested layout, build order,
business rules and security checklist, then implement the endpoints in
[`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) against the schema proposed in
[`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).

Conventions the client already assumes:

- Listens on `http://localhost:3000`, routes mounted under `/api/v1`.
- JSON errors shaped `{ code, message, details? }`.
- Cookie-based session; `GET /api/v1/auth/me` restores it.
