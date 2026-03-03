# Inferomics — Agent Reference (CLAUDE.md)

## What This Is

A FinOps decision-engine POC for AI model selection on Nebius Token Factory. Enables Product and
Engineering teams to choose inference models by balancing **Cost**, **Latency**, **Accuracy**, and
**Reliability** using weighted scoring. Optimize for clarity and speed of iteration, not perfection.

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
| Tokenizer   | gpt-tokenizer                 | Live token counting in UI        |

---

## File Structure

```
src/
  app/
    api/
      datasets/           ← GET list of datasets; POST /upload for JSONL files
      inferomics/
        config/           ← Legacy config endpoint (use /api/objective instead)
        sample/           ← POST: Cochran-sized sample generation from a dataset
      objective/          ← GET/POST Firestore-backed session persistence
    Inferomics/           ← Main active page (do not rename)
      page.tsx            ← Full decision-engine UI (single "use client" component)
    inference/
      playground/         ← Standalone playground route
        page.tsx          ← Renders PlaygroundModal
    data-lab/datasets/    ← Data Lab upload UI
    layout.tsx            ← Root layout — TopNav + Sidebar (do not restructure)
    page.tsx              ← Redirects / → /Inferomics
    globals.css           ← Design tokens and component classes (source of truth)
  components/
    UploadModal.tsx       ← JSONL file upload modal component
    PlaygroundModal.tsx   ← Tuning modal for individual parameter experimentation
    layout/               ← TopNav.tsx, Sidebar.tsx (fixed structure)
  context/
    AppContext.tsx         ← Global state + Firestore auto-save (single source of truth)
  lib/
    firebase-admin.ts     ← Firestore singleton (HMR-safe globalThis pattern)
    statistics.ts         ← calculateCochran() sample size formula
    utils.ts              ← cn() helper (clsx + twMerge)
  services/
    storage.ts            ← Cloud Storage helpers for JSONL dataset blobs
docs/                     ← Architecture, data model, design system, deployment
CLAUDE.md                 ← This file
AGENTS.md                 ← Jules agent config
.env.example              ← Required environment variables (never commit .env.local)
Dockerfile                ← Cloud Run deployment
test-connections.ts       ← Standalone script: verify Firestore + Nebius connectivity
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

**Reusable CSS Classes (globals.css — do not recreate inline):**

- `.decision-card` — glassmorphism card with border
- `.decision-card.recommended` — card with yellow-green glow border
- `.custom-slider` — styled range input with purple thumb
- `.btn-lift` — hover lift micro-interaction on buttons
- `.status-pulse` — animated pulsing dot indicator
- `.empty-dropzone` — dashed border empty state container
- `.custom-scrollbar` — styled overflow scrollbar
- `.lever-card` — card variant for Economic Lever inputs

**Typography:**

- Body: Inter (`var(--font-inter)`)
- Headings: Montserrat (`var(--font-montserrat)`)
- Monospace values (prices, scores): `font-mono` Tailwind class

**Patterns:**

- Use `clsx` + `twMerge` (imported as `cn()`) for conditional classes — see `utils.ts`
- Use lucide-react for all icons, size 16 (inline) or 18 (nav)
- Buttons: `bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm`

---

## Application Architecture

### State Management

All state lives in `AppContext.tsx`. Key behaviors:

- **Hydration**: Loads from Firestore (`/api/objective?id=default`) on mount; migrates legacy `localStorage` automatically
- **Auto-save**: Debounced 2-second save to Firestore on any state change
- **Demo Reset**: `resetState()` blanks UI without wiping Firestore; `isResetForDemo` flag prevents overwriting

### Implementation Profiles (4 total)

| ID | Name | n-exponent | Pillar Priority |
|---|---|---|---|
| `bulk` | Bulk Processor | 1.0 | Cost > Performance > Accuracy/Reliability |
| `interactive` | Real-Time Interactive | 1.2 | Performance > Accuracy > Cost/Reliability |
| `analytical` | Analytical Agent | 1.5 | Balanced (Accuracy dominant) |
| `autonomous` | Autonomous Expert | 2.0 | Accuracy > Reliability >> Cost/Performance |

Selecting a profile auto-sets Economic Lever defaults.

### Economic Levers

Three configurable inputs that drive cost modeling:

| Lever | Unit | Default | Purpose |
|---|---|---|---|
| Projected Monthly Volume | requests | 10,000 | Scale factor for spend |
| Latency Tolerance | ms | 5,000 | Hard constraint for performance scoring |
| Error Risk Cost | $ | 25.00 | Penalty per reliability failure |

### Cochran Sample Size (`src/lib/statistics.ts`)

```
n0 = (Z² × p × q) / e²   ← infinite baseline
n  = n0 / (1 + (n0-1)/N) ← finite correction
```

Accuracy tiers: High = 1% error, Standard = 5%, Low = 10%.

---

## API Route Conventions

All routes in `src/app/api/[resource]/route.ts`. Export named functions: `GET`, `POST`.

| Method | Route                    | Purpose                                   |
|--------|--------------------------|-------------------------------------------|
| GET    | /api/datasets            | List uploaded dataset metadata            |
| POST   | /api/datasets/upload     | Upload JSONL to Cloud Storage             |
| POST   | /api/inferomics/sample   | Generate Cochran sample from dataset      |
| POST   | /api/inferomics/run      | Trigger asynchronous Nebius inference     |
| GET    | /api/model/[id]/capabilities | Get dynamic Nebius parameter tolerances |
| GET    | /api/preset              | Load saved playground configs from Firestore |
| POST   | /api/preset              | Save playground config to Firestore       |
| GET    | /api/objective           | Fetch Firestore-persisted session config  |
| POST   | /api/objective           | Save/merge session config to Firestore    |

---

## Data Model Summary

See `docs/DATA_MODEL.md` for full schema.

**Firestore Collections:**

| Collection | Purpose |
|---|---|
| `objectives` | Session config persistence (doc ID: `'default'`) |
| `datasets` | Uploaded JSONL dataset metadata |
| `presets` | Individual saved Playground model configurations |

**`objectives` document fields:** `profile_id`, `master_prompt`, `selected_models[]`, `selected_dataset_id`, `accuracy`, `sampled_data`, `economic_levers.{volume, latency, error_cost}`, `updated_at`

**Firestore Admin pattern:** Use `getFirestore()` from `src/lib/firebase-admin.ts` in all API routes. Never instantiate Firestore directly. Uses `globalThis` singleton to survive HMR in dev.

---

## Scope Boundaries

**In scope:**

- Implementation Profile selection (4 profiles × 4 pillars)
- Economic Lever configuration (volume, latency, error risk)
- Model Candidate Pool (select 2–5 from 40+ AVAILABLE_MODELS)
- Master System Prompt with live token count (gpt-tokenizer)
- Dataset upload (JSONL) + Cochran sample size calculation
- Firestore-backed session persistence with auto-save
- Model parameter tuning and prompt overriding via Playground UI
- Asynchronous inference runs against Nebius Token Factory
- Demo reset mode
- Dockerfile + Cloud Run deployment

**Out of scope (do not add):**

- User authentication or login
- Charts or data visualizations (outside basic tables)
- CI/CD pipeline or multiple environments

---

## Commands

```bash
npm run dev              # Local dev server (default :3000)
PORT=3001 npm run dev    # Local dev on alternate port (preferred)
npm run build            # Production build
npm run start            # Start production server
docker build -t inferomics .          # Build container
docker run -p 8080:8080 inferomics    # Run container locally
gcloud run deploy inferomics \        # Deploy to Cloud Run
  --source . --region us-central1 \
  --allow-unauthenticated
npx ts-node --esm test-connections.ts # Verify infra connectivity
```

---

## Environment Variables

See `.env.example`. Never commit `.env.local`. For Cloud Run, set via GCP console or `gcloud run deploy --set-env-vars`.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | ✓ | `local` or `production` |
| `GOOGLE_APPLICATION_CREDENTIALS` | local only | Path to service account JSON |
| `FIRESTORE_PROJECT_ID` | ✓ | GCP project ID |
| `FIRESTORE_DATABASE_ID` | ✓ | Firestore DB name (default: `(default)`) |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | ✓ | GCS bucket for JSONL dataset uploads |
| `NEBIUS_API_KEY` | future | Nebius AI Studio API key |
