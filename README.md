# e-Tekisi web app

[![CI](https://github.com/Ranwedzi/e-tekisi-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Ranwedzi/e-tekisi-frontend/actions/workflows/ci.yml)

The web app for e-Tekisi, a minibus-taxi app for South Africa. It is built
with Next.js 16, React 19 and TypeScript, mobile-first, and installs on a
phone like an app.

- **Commuters** request or schedule a taxi, accept a driver's fare, pay from
  their wallet, follow the taxi on the map, chat, share the trip, and rate
  the driver.
- **Drivers** get vetted, go online, offer fares, run the trip, join rank
  queues, and cash out.
- **Operators** use `/ops`: driver approval, payouts, safety alerts and the
  money reconciliation.

It talks to the backend in
[e-tekisi-backend](https://github.com/Ranwedzi/e-tekisi-backend). **Start
with that README**: it has the project overview, the Docker setup that runs
everything, and the docs.

## Run it locally

1. Start the backend; the easiest way is `docker compose up -d --build` in
   the backend repo, which also runs this app. To work on the web app with
   hot reload instead, start only the backend, database and Mailpit there:
   `docker compose up -d db mailpit backend`.
2. Here:

   ```bash
   cp .env.local.example .env.local   # optional: defaults point at localhost:8080
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`, create an account, and confirm it with the
   link in Mailpit (`http://localhost:8025`).

## Configuration

These are baked in at build time, so rebuild after changing them.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | backend origin; must be in the backend's `CORS_ALLOWED_ORIGINS` (in production it's the same domain) |
| `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap tiles | map tiles; use a provider, or `/tiles/{z}/{x}/{y}.png` with the backend's self-hosted maps, for production traffic |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | OpenStreetMap credit | attribution shown on the map |

## How it's organised

```
app/
  (commuter)/          home, book, history, wallet, saved-ranks
  driver/              dashboard, earnings, queue, documents
  ops/                 operator console
  login/ register/ forgot-password/ reset-password/ verify-email/
  profile/ notifications/   both roles
  share/[token]/       the live trip page family members open (no sign-in)
  terms/ privacy/ driver-agreement/   legal pages (drafts)
  i18n/                messages: en.ts (source) + zu, st, af, ts
  icons/ manifest.ts   app icons and the install manifest
  components/          RequireAuth, AccountGate, Nav, LiveMap, ChatModal, FareDialog,
                       RatePrompt, AppPrompts (install / notifications), Feedback (toasts, dialogs)
  lib/
    api.ts             apiFetch: sends the session cookies, renews the session once on a 401, parses errors
    session.ts         who is signed in (id, role, expiry); no token is stored in the browser
    live.ts            live updates from the backend's event stream, with polling as a fallback
    push.ts            push-notification opt-in, subscribe and unsubscribe
    i18n.tsx           useT() / useLocale(), the language picker
    types.ts           shapes returned by the backend
public/sw.js           service worker: push notifications and the offline page
```

Rules of thumb:
- **API calls:** always call the backend through `apiFetch`. Error responses
  are RFC 7807 with a stable `code` (such as `INSUFFICIENT_FUNDS`); switch on
  the code, not the message.
- **Text:** put every piece of text people see in `app/i18n/en.ts` and use it
  with `t("area.key")`. See `TRANSLATIONS.md`.

## Languages

English, isiZulu, Sesotho, Afrikaans and Xitsonga are covered, about 500
messages each. People choose a language on the profile or the sign-in page.
The four translations are first drafts and need a native speaker's review
before release (`TRANSLATIONS.md`). The ops console and the legal pages stay
in English.

## Checks

```bash
npm run lint
npm run typecheck
npm test          # unit tests (Vitest): translations, sessions, the API client
npm run build
```

CI (`.github/workflows/ci.yml`) runs the same four, plus `npm audit` on
production dependencies. Unit tests live next to the code (`*.test.ts`).

## Keeping dependencies up to date

Dependabot (`.github/dependabot.yml`) opens pull requests:
- every Monday, for npm packages, the Docker base image and the GitHub
  Actions, with minor and patch updates grouped into one request per type;
- at any time, when a package has a known security hole (these also show on
  the repository's **Security** tab).

How to handle them:
- **Security fixes:** merge them as soon as CI is green.
- **Minor and patch groups:** merge when CI is green.
- **Node versions:** stay on long-term-support Node (even numbers: 20, 22,
  24). Close updates to odd versions such as `node:25`, and comment
  `@dependabot ignore this major version`.
- **Major upgrades** (for example ESLint 10, Vitest 5 or `@types/node` to a
  newer Node than the one we run): treat each as its own piece of work. Read
  the release notes, run lint, tests and the browser tests, and merge only
  when everything passes.

## End-to-end tests (Playwright)

`e2e/` drives the real app in a phone-sized Chrome against the whole stack:
- the full ride, with commuter and driver in separate browsers;
- sign-up, verification and password reset;
- driver approval and documents;
- live updates;
- safety alerts on `/ops` and staff two-step sign-in;
- sessions, data export and account deletion;
- scheduled trips;
- languages, and the installable app and offline page.

Start the stack from the backend repo (`docker compose up -d --build`), then
here (the first time, also run `npx playwright install chromium`):

```bash
npm run test:e2e
```

Settings:
- `E2E_BASE_URL` (default `http://localhost:3000`) and `E2E_API_URL`
  (default `http://localhost:8080`).
- `E2E_OPS_EMAIL` / `E2E_OPS_PASSWORD`: set them to the backend's
  `ADMIN_BOOTSTRAP_*` account. The operator tests need them.

Each run creates its own uniquely named accounts, so it can be repeated
against the same database.
