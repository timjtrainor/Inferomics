# Inferomics — Agent Reference (AGENTS.md)

## What This Is

A FinOps decision-engine POC for AI model selection on Nebius Token Factory. It enables Product and
Engineering teams to choose inference models by balancing **Cost**, **Latency**, **Accuracy**, and
**Reliability** using weighted scoring — moving model selection from a pure engineering decision to a
shared product discipline.

This is an interview demo POC. Optimize for clarity and speed of iteration, not perfection.

## Jules Core Directives

As the Jules agent, you are assisting the user in hitting their delivery prototype timeline:

- **Velocity**: Prioritize returning working, copy-pasteable code.
- **Precision**: Only modify the files explicitly necessary for the feature.
- **Boundaries**: Strictly adhere to the technology stack and "Out of scope" rules listed below.

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
| Tokenizer   | gpt-tokenizer                 | Token counting for prompts       |

---

## File Structure

```
src/
  app/
    api/
      datasets/           ← GET list of uploaded datasets; POST/upload JSONL
      inferomics/
        config/           ← GET/POST legacy config (deprecated; use /api/objective)
        sample/           ← POST: generate Cochran-sized sample from a dataset
      objective/          ← GET/POST: Firestore-backed session persistence
    Inferomics/           ← Main active page (do not rename)
      page.tsx            ← Full decision-engine UI (single client component)
    inference/
      playground/         ← Standalone playground route
        page.tsx          ← Renders PlaygroundModal
    data-lab/
      datasets/           ← Data Lab upload page for JSONL datasets
    layout.tsx            ← Root layout — TopNav + Sidebar (do not restructure)
    page.tsx              ← Redirects / → /Inferomics
    globals.css           ← Design tokens and component classes (source of truth)
  components/
    UploadModal.tsx       ← JSONL file upload modal
    PlaygroundModal.tsx   ← Reusable tuning interface for prompt/parameter selection
    layout/               ← TopNav.tsx, Sidebar.tsx (structure is fixed)
  context/
    AppContext.tsx         ← Global state + Firestore auto-save (source of truth)
  lib/
    firebase-admin.ts     ← Firestore singleton (HMR-safe globalThis pattern)
    statistics.ts         ← calculateCochran() — sample size formula
    utils.ts              ← cn() helper (clsx + twMerge)
  services/
    storage.ts            ← Cloud Storage helpers for dataset blobs
docs/                     ← Architecture, data model, design system, deployment
AGENTS.md                 ← This file (Jules config)
.agent/                   ← Antigravity config (rules.md + workflows/)
CLAUDE.md                 ← Claude Code reference
.env.example              ← Required environment variables
Dockerfile                ← Cloud Run deployment
test-connections.ts       ← Standalone script to verify Firestore + Nebius connectivity
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
- `.custom-scrollbar` — styled scrollbar for overflow containers
- `.lever-card` — card variant used for Economic Lever inputs

**Typography:**

- Body: Inter (`var(--font-inter)`)
- Headings: Montserrat (`var(--font-montserrat)`)
- Monospace values (prices, scores): `font-mono` Tailwind class

**Patterns:**

- Use `clsx` + `twMerge` (imported as `cn()`) for conditional classes.
- Use lucide-react for all icons, size 16 (inline) or 18 (nav).
- Buttons: `bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm`

---

## Application Architecture

### State Management — AppContext

All application state lives in `src/context/AppContext.tsx`. It is the **single source of truth**.

- Hydrates from Firestore on mount (`/api/objective?id=default`)
- Migrates legacy `localStorage` data to Firestore automatically on first load
- Debounces saves to Firestore (2-second delay after any state change)
- Exposes `restoreField()` for demo reset recovery and `resetState()` for full demo reset

**Context fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `selectedProfileId` | string | `'analytical'` | Active Implementation Profile |
| `masterPrompt` | string | `''` | System prompt applied to all candidate models |
| `selectedModels` | string[] | `[]` | 2–5 model IDs from AVAILABLE_MODELS |
| `projectedVolume` | number | 10000 | Monthly requests (Economic Lever) |
| `latencyTolerance` | number | 5000 | Max acceptable latency in ms (Economic Lever) |
| `errorRiskCost` | number | 25.00 | Dollar cost per reliability failure (Economic Lever) |
| `selectedDatasetId` | string | `''` | Firestore dataset doc ID |
| `accuracy` | string | `'Standard'` | `'High'` (1%) / `'Standard'` (5%) / `'Low'` (10%) |
| `sampledData` | object\|null | null | Result from `/api/inferomics/sample` |
| `configStatus` | `'DRAFT'\|'COMPLETE'` | — | COMPLETE when prompt + 2-5 models are set |
| `isResetForDemo` | boolean | false | Blanks UI for demo without wiping Firestore |

### Implementation Profiles

Four profiles define how the scoring engine weights the four pillars:

| ID | Name | n | Accuracy | Reliability | Performance | Cost |
|---|---|---|---|---|---|---|
| `bulk` | Bulk Processor | 1.0 | 10 | 10 | 30 | 50 |
| `interactive` | Real-Time Interactive | 1.2 | 30 | 10 | 50 | 10 |
| `analytical` | Analytical Agent | 1.5 | 40 | 20 | 20 | 20 |
| `autonomous` | Autonomous Expert | 2.0 | 50 | 35 | 7.5 | 7.5 |

Selecting a profile auto-populates Economic Lever defaults.

### Model Candidate Pool

`AVAILABLE_MODELS` in `page.tsx` — static list of 40+ Nebius-hosted models (Text-to-text, Vision, Embedding, Safety guardrail). Each model has: `id`, `name`, `provider`, `type`, `priceIn`, `priceOut`, `isFast`, `throughput`. Users select 2–5 models; locking occurs after sampling.

### Cochran Sample Size Formula

Implemented in `src/lib/statistics.ts`:

```
n0 = (Z² × p × q) / e²     ← infinite population baseline
n  = n0 / (1 + (n0-1) / N) ← finite population correction
```

- Z = 1.96 (95% confidence), p = 0.5 (max variability)
- e = 0.01 (High), 0.05 (Standard), 0.10 (Low)

---

## API Route Conventions

All routes in `src/app/api/[resource]/route.ts`. Export named functions: `GET`, `POST`.

| Method | Route                    | Purpose                                      |
|--------|--------------------------|----------------------------------------------|
| GET    | /api/datasets            | List all uploaded dataset metadata           |
| POST   | /api/datasets/upload     | Upload a JSONL file to Cloud Storage         |
| POST   | /api/inferomics/sample   | Generate Cochran sample from a dataset       |
| POST   | /api/inferomics/run      | Trigger async Nebius inference pipeline      |
| GET    | /api/model/[id]/capabilities | Get dynamic Nebius parameter tolerances  |
| GET    | /api/preset              | Load saved playground configs from Firestore |
| POST   | /api/preset              | Save playground config to Firestore          |
| GET    | /api/inferomics/config   | Get saved config (legacy — use /api/objective) |
| POST   | /api/inferomics/config   | Save config (legacy — use /api/objective)    |
| GET    | /api/objective           | Get Firestore-persisted session config       |
| POST   | /api/objective           | Save/merge session config to Firestore       |

---

## Data Model Summary

See `docs/DATA_MODEL.md` for full schema. Core Firestore collections:

| Collection | Key Fields | Purpose |
|---|---|---|
| `objectives` | `profile_id`, `master_prompt`, `selected_models`, `economic_levers`, `selected_dataset_id`, `accuracy`, `sampled_data` | Session config persistence (doc ID: `'default'`) |
| `datasets` | `name`, `url`, `recordCount`, `createdAt` | Uploaded JSONL dataset metadata |
| `presets` | `model_id`, `preset_name`, `master_prompt`, `parameters`, `few_shot_examples` | Individual saved Playground model configurations |

**Legacy collections (from v0.1):** `models`, `weightPresets`, `inferenceLogs` — no longer used by the main UI.

---

## Scope Boundaries

**In scope:**

- Implementation Profile selection and Economic Lever configuration
- Model Candidate Pool (select 2–5 from AVAILABLE_MODELS)
- Master System Prompt with live token count
- Dataset upload (JSONL) and Cochran sample size calculation
- Firestore-backed session persistence (auto-save via AppContext)
- Playground Tuning (Modals + Standalone UI) for prompt styling and overrides
- Execution of Nebius inference via standard REST API
- Demo reset mode (blank UI for presentation without wiping Firestore)
- Dockerfile + Cloud Run deployment

**Out of scope (do not add):**

- User authentication or login
- Charts or data visualizations (scoring output heatmap etc. outside of existing results table)
- CI/CD pipeline or multiple environments
- Any feature not directly related to the FinOps decision engine

---

## Environment Variables

```
NEXT_PUBLIC_APP_ENV         = local | production
GOOGLE_APPLICATION_CREDENTIALS = /path/to/service-account.json   # local only
FIRESTORE_PROJECT_ID        = <gcp-project-id>
FIRESTORE_DATABASE_ID       = (default)
GOOGLE_CLOUD_STORAGE_BUCKET = <bucket-name>                       # for dataset uploads
NEBIUS_API_KEY              = <nebius-studio-api-key>             # for future inference calls
```

---

## Commands

```bash
npm run dev              # Local dev server (default :3000)
PORT=3001 npm run dev    # Local dev on alternate port
npm run build            # Production build
npm run start            # Start production server
npx ts-node --esm test-connections.ts   # Verify Firestore + Nebius connectivity
gcloud run deploy inferomics \          # Deploy to Cloud Run
  --source . --region us-central1 \
  --allow-unauthenticated
```
