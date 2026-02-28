# Architecture Decisions

## Overview
Inferomics is a full-stack Next.js application. There is no separate backend service.
All API logic lives in Next.js App Router API routes (`src/app/api/`).

---

## Decision Log

### Next.js 15 (App Router)
**Why:** Provides server-side API routes without a separate backend. Enables full-stack
development in a single codebase and deploys as a single container to Cloud Run.
A junior engineer or AI agent can add a new API endpoint without touching infrastructure.

### Firestore (Google Cloud)
**Why:** Serverless, zero-ops database with a generous free tier. No connection pooling,
no instance management. Scales to zero. Perfect for a POC that may sit idle between demos.
**Not PostgreSQL because:** Requires a managed instance (Cloud SQL), adds operational overhead
not worth it for a 2-day POC.
**Not SQLite because:** Does not persist across container restarts in Cloud Run.

### Google Cloud Run
**Why:** Container-native, scales to zero, free tier covers POC usage. Pairs naturally with
Firestore in the same GCP project. Single `gcloud run deploy` command from source.

### Tailwind CSS v4
**Why:** Already configured. Theme tokens defined in `globals.css` under `@theme`. All design
decisions live there. Do not use inline hex values that duplicate theme tokens.

---

## Request Flow
```
Browser
  └─► Next.js (Cloud Run container)
        ├─► /inferonomics        → React UI (client component)
        └─► /api/recommend       → API Route → Firestore → scoring logic → JSON response
```

## Environment Strategy
| Environment | Database         | Port | How to Run                    |
|------------|-----------------|------|-------------------------------|
| Local Dev  | Firestore Emulator or live Firestore | 3001 | `PORT=3001 npm run dev` |
| Production | Firestore (live) | 8080 | Cloud Run (container)         |

**No staging environment.** For a POC, promote directly from local to production.
Use feature flags in UI (e.g., `NEXT_PUBLIC_APP_ENV`) to show/hide in-progress features.

---

## What This Architecture Enables
- One agent can add an API route and wire it to the UI without touching infra
- One command deploys to cloud
- Firestore schema is flexible — no migrations needed for a POC
- Port conflicts locally: just set `PORT=3001`
