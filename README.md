# AidLink

Community-sourced map of help available and needs during natural disasters
in Aotearoa New Zealand. **Not official. Call 111 in any emergency.**

**Live:** <https://aidlink.nz>

Anyone can drop a pin to mark either help they can offer (shelter, fuel,
food, charging, wifi, medical) or a need or issue (power outage, road
closed, hazard, supplies needed). No accounts. No personal information.

See [`docs/prd.md`](docs/prd.md) for the full product requirements,
data model, security rules, and free-tier cost analysis.

## Tech stack

| Layer | Tech | Why |
|---|---|---|
| Framework | Svelte 4 + TypeScript | Smallest bundles (~15 KB gzip app shell), fastest reactivity |
| Build | Vite 5 | Instant dev server, HMR, production build in ~2 seconds |
| Map | MapLibre GL JS | WebGL rendering — smoother than Leaflet on mobile |
| Basemap | OpenStreetMap raster tiles | Free, no API key required |
| Styling | Tailwind CSS 3 | Mobile-first utility classes, fluid root font-size scaling |
| Database | Firebase Firestore | Real-time, security rules at the DB layer, generous free tier |
| Hosting | Firebase Hosting | Google CDN, free SSL, one-command deploy, Auckland edge |
| Geo | ngeohash | Geohash encoding for pin grouping (~150 m cell at precision 7) |
| DNS | Cloudflare (free) | Authoritative DNS for aidlink.nz |

### Production bundle

| Chunk | Size (gzip) |
|---|---|
| App shell (Svelte + app code) | ~15 KB |
| Firebase SDK | ~87 KB |
| MapLibre GL JS | ~218 KB |
| CSS (Tailwind + MapLibre) | ~13 KB |

Total first-load: **~333 KB gzipped**. The shell renders before the
heavy vendor chunks arrive thanks to `manualChunks` splitting in
`vite.config.ts`.

### Key architectural decisions

- **No backend / no Cloud Functions** — pure client-side SPA hitting
  Firestore directly. Smaller attack surface, zero server cost.
- **Security enforced at the database layer** via `firestore.rules`,
  not the UI. Schema validation, NZ bounding-box checks, append-only
  updates, and no client-side deletes — all enforced server-side.
- **No PII fields in the schema** — no name, phone, email, IP, or
  device ID. By design, not by hope. The strongest privacy guarantee.
- **Session-cached geofence** (`src/lib/geofence.ts`) — one browser
  geolocation prompt per session, result reused for every gated action
  (add pin, confirm, resolve, report).
- **60-second polling with sessionStorage cache** — keeps Firestore
  read quota low while still feeling near-real-time.
- **12-hour auto-expiry** on pins so the map cannot rot.
- **Community moderation** via a flag/report button on each pin.
  `flagCount` increments monotonically, visible alongside
  `confirmCount` in the popup.

## Local development

### Prerequisites

- Node.js 18+
- Java 11+ (for the Firestore emulator)
- Firebase CLI (`npm install -g firebase-tools` or use the globally
  installed version)

### Quick start

```bash
git clone git@github.com:dilumdesilva/aidlink-nz.git
cd aidlink-nz
npm install
```

Start the Firestore emulator and the Vite dev server in two terminals:

```bash
# Terminal 1 — Firestore emulator
npm run emulators

# Terminal 2 — Vite dev server
npm run dev
```

Open <http://localhost:5173>. The app auto-connects to the local
Firestore emulator at `127.0.0.1:8080` when no `VITE_FIREBASE_PROJECT_ID`
is set in `.env`. The emulator UI is at <http://127.0.0.1:4000>.

Data in the emulator is in-memory and resets on restart.

### Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Run `svelte-check` for TypeScript errors |
| `npm run preview` | Preview the production build locally |
| `npm run emulators` | Start the Firestore emulator (port 8080, UI on 4000) |

### Using a real Firebase project locally

If you want to test against a real Firestore database instead of the
emulator:

```bash
cp .env.example .env
# Fill .env with values from your Firebase project console
npm run dev
```

The app detects `VITE_FIREBASE_PROJECT_ID` in `.env` and talks to the
real project instead of the emulator.

## Firebase setup (one-time, for your own deployment)

1. Create a new Firebase project at <https://console.firebase.google.com>
   (no need to enable Google Analytics).
2. Add a Web app in **Project settings → General → Your apps → Add app**.
   Copy the config values into `.env.production`.
3. Enable **Firestore Database** in **Native mode** in any region (e.g.
   `australia-southeast1` for NZ proximity).
4. Install the Firebase CLI if you do not have it:
   `npm install -g firebase-tools`
5. `firebase login`
6. `firebase use --add` and pick the project you just created.
7. Deploy the security rules:
   `firebase deploy --only firestore:rules`
8. Build and deploy hosting:
   `npm run build && firebase deploy --only hosting`

The deployed URL will be printed at the end (something like
`https://<project-id>.web.app`).

## Costs

**$0.** Everything runs on the Firebase Spark (free) plan with hard
quota caps — the service degrades rather than billing you if quotas are
exceeded. No credit card required.

| Resource | Free quota | AidLink usage |
|---|---|---|
| Firestore reads | 50,000 / day | ~5,000–20,000 depending on traffic |
| Firestore writes | 20,000 / day | ~100–2,000 (one per pin or action) |
| Firestore storage | 1 GiB | ~500 bytes per pin, effectively unlimited |
| Hosting bandwidth | 360 MB / day | ~150 KB per first load, ~2,400 visits/day |

See [`docs/prd.md` §8](docs/prd.md) for the full cost analysis and
viral-spike mitigation strategy.

## Security

- Firestore rules enforce schema validation, NZ bounding-box, and
  append-only updates at the database layer
- HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  and Permissions-Policy headers on every response
- XSS-safe HTML rendering in map popups via `escapeHtml()`
- Browser geofence blocks non-NZ users from creating or modifying pins
- No PII stored — there is nothing to leak
- Community flag/report mechanism for disinformation
- Spark plan hard quotas prevent surprise billing

## License

TBD
