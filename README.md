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
npx tsc --noEmit
npm run build
```
