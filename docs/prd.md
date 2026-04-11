# AidLink — Product Requirements Document

## 1. Context & Problem

During natural disasters in Aotearoa New Zealand (cyclones, floods,
earthquakes, tsunamis), official information lags real conditions by hours.
Community members on the ground know things that NEMA and regional Civil
Defence Emergency Management (CDEM) groups cannot publish in time:

- Which petrol stations actually have fuel right now
- Which shelters are open and have space
- Which roads are flooded or closed
- Where there is a power outage or no cell signal
- Where supplies are needed
- Where there are downed lines, slips, or other hazards

At the same time, people who can offer help (a generator, spare beds, hot
food, phone charging, wifi) have no shared place to advertise it during the
event itself.

AidLink is a single, public, community-sourced map for Aotearoa where anyone
can drop a pin to mark either **help available** or a **need / issue**. No
accounts, no personal information, no friction.

## 2. Goals & Non-Goals

### Goals
- Ship a working public URL within ~5 focused hours.
- Zero recurring cost on the free tiers of all services used.
- Mobile-first, fast, smooth UI usable on a poor cellular connection.
- Self-maintaining: pins auto-expire so the map cannot rot.
- Safe by construction: no personal information collected, ever.

### Non-Goals (explicitly out of scope)
- Replacement for **111**. Every screen says so loudly.
- Personal distress signaling (no "I am trapped, here is my phone number").
- Accounts, login, profiles, or any auth flow.
- Photo or file uploads — text only. Avoids moderation burden and storage
  costs entirely.
- Notifications, SMS, email alerts.
- Multi-language UI in v1 (English only; te reo Māori in a follow-up).
- Offline / PWA / install prompts in v1.
- Any official integration with NEMA, CDEM, FENZ, or NZ Police. AidLink is
  unofficial and clearly labelled as such.

## 3. Users & Core Flows

### Anonymous reporter (anyone in NZ)
1. Opens the URL on a phone.
2. Sees the disclaimer banner and a map of NZ with existing pins.
3. Taps "Add a pin" → chooses Help or Need → chooses category → uses
   geolocation or taps a point on the map → types a short title and
   description → submits.
4. Sees their pin appear on the map immediately.

### Anonymous browser (anyone in NZ)
1. Opens the URL.
2. Sees pins, can filter by Help / Need / category, can tap a pin for
   details, can tap "Still accurate" to confirm or "Resolved" to clear.

That is the entire product. Two flows. No screens beyond the map and a
single add-pin modal.

## 4. Pin Types & Categories

### Help Available (green pins)
- `shelter` — Shelter / safe building open
- `fuel` — Petrol or diesel available
- `food` — Food, water, supplies
- `power` — Phone charging or generator
- `wifi` — Free wifi / connectivity
- `medical` — Pharmacy or medical help
- `other_help` — Other help available

### Needs / Issues (orange pins)
- `outage` — Power outage
- `no_signal` — No cell or internet signal
- `road` — Road closed, flooded, or unsafe
- `hazard` — Downed line, slip, or fallen tree
- `supplies` — Supplies needed in this area
- `other_need` — Other need or issue

## 5. Data Model

Single Firestore collection: `pins/{pinId}`.

| Field          | Type             | Notes                                         |
|----------------|------------------|-----------------------------------------------|
| `type`         | `"help"`/`"need"`| Drives marker colour                          |
| `category`     | string enum      | One of the categories above                   |
| `title`        | string ≤ 80      | Short label                                   |
| `description`  | string ≤ 280     | Plain text only                               |
| `lat`          | number           | Clamped to NZ bounds                          |
| `lng`          | number           | Clamped to NZ bounds                          |
| `geohash`      | string           | Precision 7 (~150m), for grouping             |
| `status`       | enum             | `active` / `resolved` / `stale`               |
| `confirmCount` | number           | "Still accurate" upvotes                      |
| `createdAt`    | server timestamp |                                               |
| `updatedAt`    | server timestamp |                                               |
| `expiresAt`    | server timestamp | `createdAt + 12h`, auto-stale after            |
| `userAgent`    | string           | Soft spam triage only, never displayed         |

**No personal information fields. No phone, email, name, IP, device ID.**

## 6. Tech Stack

Optimised for: free-tier hosting, fastest possible UI, smallest bundle,
lowest friction to build in hours.

| Layer        | Choice                                | Why                                                                                  |
|--------------|---------------------------------------|--------------------------------------------------------------------------------------|
| Build tool   | Vite                                  | Instant dev server, tiny config, matches existing muscle memory                      |
| Framework    | Svelte (not SvelteKit)                | Smallest bundles, fastest reactivity, best mobile feel; SPA only so no need for SK   |
| Language     | TypeScript                            | Catches schema bugs in the rules / data model early                                  |
| Styling      | Tailwind CSS (CDN build)              | No design system needed, mobile-first utilities                                      |
| Map          | MapLibre GL JS                        | WebGL renderer → smoother than Leaflet on mobile, especially with many markers       |
| Basemap      | OpenStreetMap raster tiles            | Free, no API key. (LINZ Basemaps is the NZ-official upgrade for v1.1.)               |
| Geo helper   | `ngeohash`                            | Tiny, no native deps                                                                 |
| Backend      | Firebase Firestore (Spark/free plan)  | Free tier, real-time, security rules enforce write integrity at the DB layer         |
| Hosting      | Firebase Hosting (Spark/free plan)    | Free tier, fast global CDN, one command deploy                                       |
| Project      | Brand-new dedicated Firebase project  | Clean separation from any other work, easy to delete, no cross-project risk          |

### Why Svelte over React or vanilla
- Svelte compiles away the framework — bundle is ~10 KB vs ~45 KB React.
- Reactivity model needs no `useState` / `useEffect` boilerplate, so the
  add-pin modal is shorter to write than the React equivalent.
- Single-file components keep the file count tiny (~6 files for the whole
  app).
- On a poor cellular connection during a disaster, every kilobyte matters.

### Why MapLibre over Leaflet
- WebGL panning is noticeably smoother on mid-range Android phones.
- Better behaviour with 100+ markers — no DOM thrash.
- Drop-in path to LINZ vector basemaps later (LINZ publishes MapLibre style
  JSON).

## 7. Firebase Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /pins/{pinId} {

      // Public read — no PII, so this is safe by design
      allow read: if true;

      // Anyone can create a well-formed pin within NZ bounds
      allow create: if
        request.resource.data.type in ['help', 'need']
        && request.resource.data.category is string
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 80
        && request.resource.data.description is string
        && request.resource.data.description.size() <= 280
        && request.resource.data.lat is number
        && request.resource.data.lat >= -47.5 && request.resource.data.lat <= -34.0
        && request.resource.data.lng is number
        && request.resource.data.lng >= 166.0 && request.resource.data.lng <= 179.0
        && request.resource.data.status == 'active'
        && request.resource.data.confirmCount == 0;

      // Updates restricted: only status / confirmCount can change.
      // Original content is locked → vandals cannot rewrite pins.
      allow update: if
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'confirmCount', 'updatedAt'])
        && request.resource.data.confirmCount <= resource.data.confirmCount + 1
        && request.resource.data.status in ['active', 'resolved', 'stale'];

      // No client-side deletes
      allow delete: if false;
    }
  }
}
```

## 8. Free-Tier Cost Analysis (Firebase Spark Plan)

The Spark plan is free, has no credit card requirement, and **enforces hard
quotas — if AidLink exceeds a limit it stops serving rather than billing**.
This is the key safety property: no surprise invoice is possible.

> Limits below are accurate as of writing but Firebase pricing changes —
> verify at <https://firebase.google.com/pricing> before launch.

### Firestore (Spark)
| Resource              | Free quota         | AidLink consumption estimate                                  |
|-----------------------|--------------------|---------------------------------------------------------------|
| Stored data           | 1 GiB              | ~500 bytes per pin → ~2 million pins fit. Not a constraint.  |
| Document reads        | 50,000 / day       | **The real risk.** See below.                                 |
| Document writes       | 20,000 / day       | One write per new pin + one per confirm/resolve. ~10K easily. |
| Document deletes      | 20,000 / day       | None (delete is disabled).                                    |
| Network egress        | 10 GiB / month     | Tiny payloads, not a constraint.                              |

### Hosting (Spark)
| Resource         | Free quota        | AidLink consumption estimate                              |
|------------------|-------------------|-----------------------------------------------------------|
| Stored files     | 10 GB             | Bundle ~150 KB. Not a constraint.                         |
| Data transferred | 360 MB / day      | At ~150 KB per first load, ~2,400 first-time loads/day.   |
| Custom domain    | 1 free            | Sufficient.                                               |

### The viral-spike risk
The single binding constraint is **Firestore reads**. If the site is shared
widely and 1,000 people each load the map and see 50 active pins, that is
50,000 reads in one wave — the entire daily quota.

**Mitigations baked into the design:**
1. **One bulk query per session**, not per marker. `getDocs(query(pins, where status == active))` → one Firestore call returns N documents but counts as N reads, not 1. So this only helps a little.
2. **Client-side cache with TTL**: fetch once on load, refresh every 60 seconds, never on every interaction. A user browsing the map for 5 minutes costs 5–6 read batches, not hundreds.
3. **Local snapshot cache** in `sessionStorage` so pan / zoom does not refetch.
4. **CDN in front of the read endpoint** (v1.1): proxy reads through a Cloud Function or Cloudflare Worker that caches the active-pins list for 30 seconds. Cuts Firestore reads to ~2,880/day regardless of traffic. Not in v1 because Cloud Functions in Spark have tighter limits and add complexity.
5. **Hard fail-open**: if Firestore returns quota-exceeded, the UI shows a banner saying "Map updates paused, try again later" rather than crashing.

### What is *not* used (and therefore costs nothing)
- Cloud Functions (not needed in v1)
- Cloud Storage (no photo uploads — text only)
- Firebase Authentication (no accounts)
- Firebase Cloud Messaging (no notifications)
- Realtime Database (using Firestore instead)
- BigQuery / extensions (none enabled)

### Bottom line
On the Spark plan, AidLink **cannot generate a bill**. The worst case is the
service stops serving fresh data for the rest of the day. We will not enable
the Blaze (pay-as-you-go) plan in v1.

## 9. File Layout

```
aidlink/
├── docs/
│   └── prd.md                  ← this file
├── public/
│   └── favicon.svg
├── src/
│   ├── App.svelte              ← root component, layout, disclaimer banner
│   ├── main.ts                 ← Vite entry
│   ├── lib/
│   │   ├── firebase.ts         ← init, exports `db`
│   │   ├── pins.ts             ← typed CRUD (create, list active, confirm, resolve)
│   │   ├── categories.ts       ← enum + label + colour + icon mapping
│   │   ├── geo.ts              ← geohash + NZ bounds check
│   │   └── staleness.ts        ← client-side stale filter
│   ├── components/
│   │   ├── Map.svelte          ← MapLibre wrapper, marker rendering
│   │   ├── AddPinModal.svelte  ← type → category → location → text → submit
│   │   ├── PinPopup.svelte     ← popup body with confirm / resolve buttons
│   │   ├── Disclaimer.svelte   ← red banner, 111 messaging
│   │   └── Filters.svelte      ← help/need/category toggle bar
│   └── app.css                 ← Tailwind directives
├── firestore.rules             ← rules from §7
├── firebase.json               ← hosting + Firestore config
├── .firebaserc                 ← project alias
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── README.md
```

## 10. Build Order

Each step ends with something deployable.

1. **Scaffold + first deploy** (~20 min)
   `npm create vite@latest -- --template svelte-ts`, install Tailwind,
   `firebase init hosting firestore`, `firebase deploy`. URL is live with a
   blank page. Confirms the deploy pipeline before any feature work.
2. **Disclaimer banner + landing copy** (~15 min)
   Red top banner: *"AidLink is a community map. NOT official. Call 111 in
   any emergency. Information may be inaccurate."* Same banner inside the
   add-pin modal.
3. **MapLibre map of NZ** with OSM raster tiles, no data (~25 min)
4. **Read pins from Firestore and render markers** by type (~30 min)
   Bulk query on load + 60-second refresh, plus sessionStorage cache.
5. **Add-pin modal**: type → category → geolocation or tap → text → submit
   (~60 min)
6. **Lock down `firestore.rules`** and verify from devtools console:
   - malformed pin → must fail
   - pin outside NZ bounds → must fail
   - delete attempt → must fail
   - update of locked field → must fail
   (~25 min)
7. **Confirm / Resolve buttons** in the pin popup (~30 min)
8. **Stale filter**: hide pins past `expiresAt` or `status != active`,
   with a "show stale" toggle (~20 min)
9. **Filter bar**: toggle Help / Need and individual categories (~25 min)
10. **Mobile smoke test** on a real phone on cellular (~15 min)
11. **Notification email** to NEMA, regional CDEM, FENZ, Red Cross (in
    parallel with step 10), then share publicly.

Estimated total: 4–5 focused hours.

## 11. Verification Checklist

Before sharing the URL with anyone:

- [ ] Disclaimer banner is impossible to miss on mobile (red, top of viewport)
- [ ] Add a pin from a real phone on cellular — geolocation, submit, appear
- [ ] Open the URL on a second device — confirm the new pin is visible
- [ ] Confirm / resolve buttons work and update the marker live
- [ ] Stale filter hides pins with `expiresAt` in the past
- [ ] From devtools console:
  - Try to write a pin with a 1000-char title → fails
  - Try to write a pin at lat 0, lng 0 → fails (outside NZ bounds)
  - Try to delete a pin → fails
  - Try to update another pin's title → fails
- [ ] No PII fields exist in any document on the wire (Network tab inspect)
- [ ] Map performance with ~50 fake pins remains smooth on a mid-range
      Android phone
- [ ] Quota dashboard checked: Firestore reads / writes nowhere near limits
- [ ] Notification email sent to NEMA / CDEM / FENZ / Red Cross

## 12. Post-Launch (v1.1 and beyond)

Not in v1, but worth queuing:
- te reo Māori translation (and Samoan, Tongan, Mandarin, Hindi, Filipino)
- Cloudflare Worker cache in front of Firestore reads (cuts read quota
  consumption to a flat ~3K/day regardless of traffic)
- LINZ Basemaps vector tiles instead of OSM raster
- PWA / offline cache with stale-while-revalidate
- "Subscribe to this area" via web push (no accounts — just an opt-in
  push subscription tied to a bounding box)
- Moderation queue for flagged pins
- Read-only JSON / GeoJSON export endpoint for civic-tech reuse
- Formal conversation with NEMA / CDEM about whether AidLink data could
  feed any of their workflows
