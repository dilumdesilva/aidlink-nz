# AidLink

Community-sourced map of help available and needs during natural disasters
in Aotearoa New Zealand. **Not official. Call 111 in any emergency.**

Anyone can drop a pin to mark either help they can offer (shelter, fuel,
food, charging, wifi, medical) or a need or issue (power outage, road
closed, hazard, supplies needed). No accounts. No personal information.

See [`docs/prd.md`](docs/prd.md) for the full product requirements,
data model, security rules, and free-tier cost analysis.

## Stack

Vite + Svelte + TypeScript · MapLibre GL JS · Firebase Hosting + Firestore
(Spark / free plan) · Tailwind CSS

## Local development

```bash
npm install
cp .env.example .env
# Fill .env with values from your Firebase project
npm run dev
```

`npm run check` runs `svelte-check` for TypeScript errors.
`npm run build` produces a production bundle in `dist/`.

## Firebase setup (one-time)

1. Create a new Firebase project at <https://console.firebase.google.com>
   (no need to enable Google Analytics).
2. Add a Web app in **Project settings → General → Your apps → Add app**.
   Copy the config values into `.env`.
3. Enable **Firestore Database** in **Native mode** in any region (e.g.
   `australia-southeast1` for NZ proximity).
4. Install the Firebase CLI if you do not have it:
   `npm install -g firebase-tools`
5. `firebase login`
6. `firebase use --add` and pick the project you just created.
7. Deploy the security rules first:
   `firebase deploy --only firestore:rules`
8. Build and deploy hosting:
   `npm run build && firebase deploy --only hosting`

The deployed URL will be printed at the end (something like
`https://<project-id>.web.app`).

## Costs

$0 on the Firebase Spark (free) plan — Spark uses hard quotas, so the
service stops serving fresh data rather than billing you if quotas are
exceeded. See [`docs/prd.md` §8](docs/prd.md) for the full cost analysis.
