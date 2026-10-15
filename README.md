# e-Tekisi frontend

Next.js 16 / React 19 app for e-Tekisi: a mobile-first web app for
commuters (book a minibus taxi, pay from a wallet, chat with the driver)
and drivers (go online, set fares, complete trips, manage rank queues,
cash out). It talks to the Spring Boot backend in the `e-tekisi-backend`
repo.

## Run it locally

1. Start the backend (see its README). It listens on `http://localhost:8080`.
2. Configure and start the frontend:

   ```bash
   cp .env.local.example .env.local   # optional: defaults point at localhost:8080
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`, create an account and sign in.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | backend origin (must be in the backend's `CORS_ALLOWED_ORIGINS`) |
| `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap tiles | map tiles; use a tile provider for production traffic |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | OpenStreetMap credit | attribution shown on the map |

## How it's organised

```
app/
  (commuter)/        home, book, history, wallet, saved-ranks (commuters only)
  driver/            dashboard, earnings, queue (drivers only)
  login/, register/  public
  profile/, notifications/   both roles
  components/        RequireAuth, Feedback (toasts/confirm), Nav, LiveMap, ChatModal, FareDialog, Icons
  lib/
    api.ts           apiFetch: adds the Bearer token, parses errors, sends 401s to /login
    session.ts       the signed-in user (token + expiry) in localStorage
    usePolling.ts    polling that pauses in hidden tabs and backs off on errors
    types.ts         shapes returned by the backend
```

Always call the backend through `apiFetch`; it is the one place that knows
the base URL and the token. Error responses are RFC 7807 with a stable
`code` (e.g. `INSUFFICIENT_FUNDS`); switch on that, not on the message.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the same three.

## End-to-end tests (Playwright)

`e2e/` drives the real app on a phone-sized Chrome: sign-in guards, sign-up
validation, the operator screen, and the full ride (commuter tops up and
books → driver offers a fare → commuter accepts and pays → driver completes
→ driver requests a payout), with commuter and driver in separate browsers.

They need the whole stack running. From the backend repo:

```bash
docker compose up -d --build
```

Then here (first time: `npx playwright install chromium`):

```bash
npm run test:e2e
```

Settings: `E2E_BASE_URL` (default `http://localhost:3000`), `E2E_API_URL`
(default `http://localhost:8080`). The operator test runs only when
`E2E_OPS_EMAIL` / `E2E_OPS_PASSWORD` are set to the backend's
`ADMIN_BOOTSTRAP_*` account. Each run creates its own uniquely named
accounts, so it can be repeated against the same database.
