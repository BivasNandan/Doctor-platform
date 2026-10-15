# Carewell client

React 19 + Vite web app for patients, doctors and administrators.

```sh
npm install
npm run dev        # http://localhost:5173/Doctor-platform/
npm run check      # lint + format check + tests + production build
```

- Architecture and conventions: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- Backend contract: [`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md)
- Configuration: copy [`.env.example`](.env.example) to `.env.local`. `VITE_CAREWELL_DATA_MODE=demo` (default) uses
  fictional in-memory data; `api` talks to the backend through the dev proxy.
