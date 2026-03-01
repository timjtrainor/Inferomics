# Inferomics — Agent Reference (CLAUDE.md)

## What This Is
A FinOps decision-engine POC for AI model selection. It enables Product and Engineering teams
to choose inference models by balancing **Cost**, **Latency**, and **Accuracy** using weighted
scoring — moving model selection from a pure engineering decision to a shared product discipline.

This is an interview demo POC. Optimize for clarity and speed of iteration, not perfection.

---

## Stack
| Concern      | Choice                        | Why                              |
|-------------|-------------------------------|----------------------------------|
| Framework   | Next.js 15 (App Router)       | Full-stack, API routes built-in  |
| Language    | TypeScript                    | Already configured               |
| Styling     | Tailwind CSS v4 + globals.css | Custom theme already defined     |
| Icons       | lucide-react only             | Already installed, consistent    |
| Utilities   | clsx + tailwind-merge         | Already installed                |
| Database    | Firestore (Google Cloud)      | Serverless, free tier, zero ops  |
| Deployment  | Google Cloud Run              | Container-native, free tier      |

---

## File Structure
```
src/
  app/
    api/              ← All backend API routes go here
    Inferomics/     ← Main active page (do not rename)
    layout.tsx        ← Root layout — TopNav + Sidebar (do not restructure)
    page.tsx          ← Redirects / → /Inferomics
    globals.css       ← Design tokens and component classes (source of truth)
  components/
    layout/           ← TopNav.tsx, Sidebar.tsx (structure is fixed)
docs/                 ← Agent reference docs
CLAUDE.md             ← This file
.env.example          ← Required environment variables (never commit .env.local)
Dockerfile            ← Cloud Run deployment
```

---

## Design System — Always Follow These

**Color Tokens (from globals.css @theme):**
- Background: `#001A2B`
- Surface: `#0D1117`
- Border: `#1F2937`
- Primary (purple): `#6B4EFF`
- Accent (yellow-green): `#E0FF4F`
- Text primary: `gray-200 / #e5e7eb`
- Text muted: `gray-400 / gray-500`

**Reusable CSS Classes (defined in globals.css — do not recreate inline):**
- `.decision-card` — glassmorphism card with border
- `.decision-card.recommended` — card with yellow-green glow border
- `.custom-slider` — styled range input with purple thumb
- `.btn-lift` — hover lift micro-interaction on buttons
- `.status-pulse` — animated pulsing dot indicator
- `.empty-dropzone` — dashed border empty state container

**Typography:**
- Body: Inter (`var(--font-inter)`)
- Headings: Montserrat (`var(--font-montserrat)`)
- Monospace values (prices, scores): `font-mono` Tailwind class

**Patterns:**
- Use `clsx` + `twMerge` (imported as `cn()`) for conditional classes — see Sidebar.tsx
- Use lucide-react for all icons, size 16 (inline) or 18 (nav)
- Buttons: `bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm`

---

## API Route Conventions
All routes in `src/app/api/[resource]/route.ts`. Export named functions: `GET`, `POST`, `PUT`, `DELETE`.

| Method | Route              | Purpose                               |
|--------|-------------------|---------------------------------------|
| GET    | /api/models        | List all model configs                |
| POST   | /api/models        | Create a model config                 |
| GET    | /api/recommend     | Get weighted recommendation           |
| POST   | /api/weights       | Save a weight preset                  |
| GET    | /api/weights       | Get all saved weight presets          |

Query params for `/api/recommend`: `?accuracy=75&latency=40&cost=50`

---

## Data Model Summary
See `docs/DATA_MODEL.md` for full schema and seed data.

**Firestore Collections:** `models` | `weightPresets` | `inferenceLogs`

**Core scoring formula:**
```
score = (accuracyWeight × normalizedAccuracy)
      + (latencyWeight  × (1 − normalizedLatency))
      + (costWeight     × (1 − normalizedCost))
```
Weights are 0–100 integers. Normalize each metric across all models before scoring.

---

## Scope Boundaries

**In scope:**
- Model comparison with weighted scoring
- Firestore CRUD for model configs
- Save/load weight presets
- Recommend optimal model from weights
- Dockerfile + Cloud Run deployment

**Out of scope (do not add):**
- User authentication or login
- File upload or CSV import
- Charts or data visualizations
- CI/CD pipeline or multiple environments
- Error boundaries, loading skeletons, toast notifications
- Any feature not directly related to the cost/latency/accuracy decision engine

---

## Commands
```bash
npm run dev              # Local dev server (default :3000)
PORT=3001 npm run dev    # Local dev on alternate port
npm run build            # Production build
npm run start            # Start production server
docker build -t inferomics .          # Build container
docker run -p 8080:8080 inferomics    # Run container locally
gcloud run deploy inferomics \        # Deploy to Cloud Run
  --source . --region us-central1 \
  --allow-unauthenticated
```

---

## Environment Variables
See `.env.example`. Never commit `.env.local`. For Cloud Run, set vars via GCP console or `gcloud run deploy --set-env-vars`.

Required:
- `NEXT_PUBLIC_APP_ENV` — `local` | `production`
- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON (local only)
- `FIRESTORE_PROJECT_ID` — GCP project ID
- `FIRESTORE_DATABASE_ID` — Firestore database name (default: `(default)`)
