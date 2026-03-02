# Inferomics — Antigravity Agent Rules

## Core Directives

As the Antigravity agent, you are empowered to act autonomously to help the user hit their delivery timeline:

- **Velocity**: Optimize for clarity and speed of iteration, not perfection.
- **Precision**: Only modify files explicitly necessary for the feature.
- **Boundaries**: Strictly adhere to the technology stack and "Out of scope" rules below.

---

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 + `globals.css` (custom theme already defined)
- Icons: lucide-react only (size 16 inline, 18 nav)
- Database: Firestore (Google Cloud) — via `src/lib/firebase-admin.ts`
- Storage: Google Cloud Storage — via `src/services/storage.ts`
- Deployment: Google Cloud Run

---

## Design System

- All color tokens defined in `src/app/globals.css` under `@theme`.
- **Do not** use raw hex values when a CSS token or class already exists.
- Reusable classes: `.decision-card`, `.lever-card`, `.custom-slider`, `.btn-lift`, `.custom-scrollbar`, `.status-pulse`, `.empty-dropzone`
- Use `cn()` (`clsx` + `twMerge`, from `src/lib/utils.ts`) for conditional classNames.

---

## State Management Rules

**`AppContext` is the single source of truth.** All persistent application state flows through `src/context/AppContext.tsx`.

- **Never** write to `localStorage` directly — the context handles migration automatically.
- **Never** call `/api/inferomics/config` for new features — use `/api/objective` instead.
- Auto-save is debounced (2s) and triggered by any context state change.
- `isResetForDemo` flag: when `true`, state changes must NOT be persisted. Respect this in any new feature that writes to context.
- `configStatus` is `'COMPLETE'` only when `masterPrompt` is non-empty and `selectedModels` has 2–5 items. Gate data-dependent UI on this.

---

## API Route Conventions

- All backend routes live in `src/app/api/[resource]/route.ts`.
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`.
- Use `getFirestore()` from `src/lib/firebase-admin.ts` in every API route that touches Firestore. Never instantiate `Firestore` directly — the singleton pattern prevents HMR connection leaks.

---

## Data Model

**Active Firestore collections:**

- `objectives` — session config persistence (doc ID: `'default'`)
  - Fields: `profile_id`, `master_prompt`, `selected_models[]`, `selected_dataset_id`, `accuracy`, `sampled_data`, `economic_levers.{volume, latency, error_cost}`, `updated_at`
- `datasets` — uploaded JSONL dataset metadata
  - Fields: `name`, `url`, `recordCount`, `createdAt`

**Deprecated collections (do not use):** `models`, `weightPresets`, `inferenceLogs`

---

## Sample Size Formula

`calculateCochran(populationSize, marginOfError)` in `src/lib/statistics.ts`:

- Accuracy tiers → margin of error: High → 0.01, Standard → 0.05, Low → 0.10
- Always cap sample at `Math.min(cochranResult, dataset.recordCount)`
- Demo mode hard cap: 25 records

---

## Scope Boundaries

**In scope:**

- Implementation Profile selection and Economic Lever configuration
- Model Candidate Pool (2–5 models from AVAILABLE_MODELS in page.tsx)
- Master System Prompt with live gpt-tokenizer token count
- Dataset upload (JSONL) + Cochran sample size
- Firestore-backed auto-save session persistence
- Demo reset mode
- Dockerfile + Cloud Run deployment

**Out of scope (do not add):**

- User authentication or login
- Charts or data visualizations
- CI/CD pipelines
- Inference API calls to Nebius (future phase, not yet in scope)
- Any feature not directly related to the FinOps decision engine
