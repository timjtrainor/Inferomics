# Architecture Decisions

## Overview

Inferomics is a full-stack Next.js application. There is no separate backend service.
All API logic lives in Next.js App Router API routes (`src/app/api/`).
All UI state is managed by a single React context (`src/context/AppContext.tsx`).

---

## Decision Log

### Next.js 15 (App Router)

**Why:** Provides server-side API routes without a separate backend. Enables full-stack
development in a single codebase and deploys as a single container to Cloud Run.
A junior engineer or AI agent can add a new API endpoint without touching infrastructure.

### Firestore (Google Cloud)

**Why:** Serverless, zero-ops database with a generous free tier. No connection pooling,
no instance management. Scales to zero. Perfect for a POC that may sit idle between demos.
**HMR singleton pattern:** `src/lib/firebase-admin.ts` uses `globalThis` to cache the Firestore
instance across Next.js hot-module reloads, preventing connection proliferation in dev.

### Google Cloud Storage

**Why:** Stores raw JSONL dataset blobs. Firestore stores only the metadata (`datasets` collection);
the actual file lives in GCS. `src/services/storage.ts` handles upload/download.

### Google Cloud Run

**Why:** Container-native, scales to zero, free tier covers POC usage. Pairs naturally with
Firestore and GCS in the same GCP project. Single `gcloud run deploy` command from source.

### Tailwind CSS v4

**Why:** Already configured. Theme tokens defined in `globals.css` under `@theme`. All design
decisions live there. Do not use inline hex values that duplicate theme tokens.

### AppContext (Single Source of Truth)

**Why:** Centralizes all session state in one place, enabling:

- Firestore hydration on mount with localStorage migration fallback
- Debounced auto-save (2s) to Firestore after any change
- Demo reset mode (`isResetForDemo`) that blanks UI without wiping Firestore
- Config status gate (`'DRAFT' | 'COMPLETE'`) to prevent premature data access

---

## Request Flow

```
Browser
  └─► Next.js (Cloud Run container)
        ├─► /Inferomics           → React UI (client component, AppContext)
        ├─► /data-lab/datasets    → Data Lab upload UI
        ├─► /api/objective        → Firestore objectives collection (GET/POST)
        ├─► /api/datasets         → Firestore datasets collection (GET)
        ├─► /api/datasets/upload  → GCS blob upload + Firestore metadata write
        └─► /api/inferomics/sample→ Cochran sample from GCS dataset (POST)
```

## Data Flow: Session Persistence

```
AppContext (state)
  ├─ on mount  → GET /api/objective → Firestore
  ├─ on change → debounce 2s → POST /api/objective → Firestore
  └─ on reset  → resetState() → blank UI (isResetForDemo=true, no Firestore write)
```

## Data Flow: Dataset Sampling

```
User selects dataset + accuracy tier
  → calculateCochran(N, e)         ← immediate UI preview (statistics.ts)
  → POST /api/inferomics/sample    ← triggers actual sample on button click
        └─► GCS (fetch JSONL)
        └─► Cochran formula
        └─► sampledData → AppContext → Firestore (auto-save)
```

---

## Environment Strategy

| Environment | Database | Storage | Port | How to Run |
|------------|---------|---------|------|------------|
| Local Dev | Live Firestore | Live GCS | 3001 | `PORT=3001 npm run dev` |
| Production | Firestore (live) | GCS (live) | 8080 | Cloud Run (container) |

**No staging environment.** For a POC, promote directly from local to production.
Use `NEXT_PUBLIC_APP_ENV` to show/hide in-progress features.

---

## What This Architecture Enables

- One agent can add an API route and wire it to AppContext without touching infra
- One command deploys to cloud
- Firestore schema is flexible — no migrations needed for a POC
- Singleton Firestore pattern prevents HMR leaks in development
- Demo reset allows live presentations without destroying saved user config
