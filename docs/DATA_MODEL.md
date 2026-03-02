# Data Model

## Firestore Collections

---

### `objectives` — Session Configuration Persistence

Primary collection. Stores the user's full working configuration. Uses a single document
with a fixed ID of `'default'` for the POC (one session per deployment).

```typescript
interface ObjectiveConfig {
  profile_id: string;            // 'bulk' | 'interactive' | 'analytical' | 'autonomous'
  master_prompt: string;         // System prompt applied across all candidate models
  selected_models: string[];     // 2–5 model IDs from AVAILABLE_MODELS
  selected_dataset_id: string;   // Firestore dataset doc ID
  accuracy: string;              // 'High' | 'Standard' | 'Low'
  sampled_data: SampledData | null;
  economic_levers: {
    volume: number;              // Projected monthly requests
    latency: number;             // Latency tolerance in ms
    error_cost: number;          // Dollar cost per reliability failure
  };
  updated_at: Date;
}

interface SampledData {
  sampleSize: number;            // Cochran-derived sample size (capped at population)
  totalRecords: number;          // Full dataset record count
  sample: Record<string, unknown>[];  // Actual sampled records
}
```

**API:**

- `GET /api/objective?id=default` — fetch config
- `POST /api/objective` — save/merge config (uses Firestore `set({ merge: true })`)

---

### `datasets` — Uploaded JSONL Dataset Metadata

Stores metadata for each uploaded dataset. The actual JSONL file lives in Google Cloud Storage.

```typescript
interface DatasetMeta {
  id: string;           // Firestore document ID
  name: string;         // Display name (from filename)
  url: string;          // GCS public or signed URL
  recordCount: number;  // Number of records in the JSONL file
  createdAt: string;    // ISO timestamp
}
```

**API:**

- `GET /api/datasets` — list all datasets
- `POST /api/datasets/upload` — upload JSONL → GCS + write metadata to Firestore

---

## Implementation Profiles

Four profiles are defined statically in `src/app/Inferomics/page.tsx` (`PROFILES`).
They are NOT stored in Firestore — the selected `profile_id` is stored in `objectives`.

| ID | Name | n-exponent | Accuracy | Reliability | Performance | Cost |
|---|---|---|---|---|---|---|
| `bulk` | Bulk Processor | 1.0 | 10 | 10 | 30 | 50 |
| `interactive` | Real-Time Interactive | 1.2 | 30 | 10 | 50 | 10 |
| `analytical` | Analytical Agent | 1.5 | 40 | 20 | 20 | 20 |
| `autonomous` | Autonomous Expert | 2.0 | 50 | 35 | 7.5 | 7.5 |

**Economic Lever defaults per profile:**

| Profile | Volume | Latency (ms) | Error Risk Cost |
|---|---|---|---|
| bulk | 1,000,000 | 250 | $0.05 |
| interactive | 100,000 | 500 | $2.50 |
| analytical | 10,000 | 5,000 | $25.00 |
| autonomous | 1,000 | 30,000 | $100.00 |

---

## Model Candidate Pool

Defined statically in `src/app/Inferomics/page.tsx` (`AVAILABLE_MODELS`). Not stored in Firestore.
Selected model IDs are persisted via `objectives.selected_models[]`.

```typescript
interface ModelSpec {
  id: string;         // Unique slug, e.g. 'llama-3-3-fast'
  name: string;       // Display name, e.g. 'Llama-3.3-70B-Instruct'
  provider: string;   // e.g. 'Meta', 'Qwen', 'DeepSeek'
  type: string;       // 'Text-to-text' | 'Vision' | 'Embedding' | 'Safety guardrail'
  priceIn: number;    // USD per 1M input tokens
  priceOut: number;   // USD per 1M output tokens (0 for embedding models)
  isFast: boolean;    // Whether this is the "Fast" tier variant
  throughput: number; // Tokens/second (0 if not applicable)
}
```

40+ models from providers including Meta, Qwen, DeepSeek, Google, NVIDIA, Moonshot AI, Z.ai, etc.
Filtered in UI to `Text-to-text` and `Vision` types only (Embedding/Safety excluded from selection).
Users select 2–5 models. Selection is locked after sampling.

---

## Scoring Algorithm (Proposed — not yet executed in backend)

The scoring logic is outlined for future inference execution. Implement in `src/lib/scoring.ts`.

**Total Economic Impact (TEI) formula:**

```
TEI = (avgTokenCost × projectedVolume) + ((1 - reliabilityRate) × volume × errorRiskCost)
```

**Weighted pillar score:**

```
score = (accuracyWeight / totalWeight × normAccuracy^n)
      + (reliabilityWeight / totalWeight × normReliability^n)
      + (performanceWeight / totalWeight × (1 − normLatency)^n)
      + (costWeight / totalWeight × (1 − normCost)^n)
```

Where `n` is the profile exponent (1.0–2.0). Normalize each metric across all selected models before scoring.

---

## Cochran Sample Size Formula

Implemented in `src/lib/statistics.ts`:

```typescript
function calculateCochran(
  populationSize: number,   // N — total dataset records
  marginOfError: number,    // e — 0.01 (High), 0.05 (Standard), 0.10 (Low)
  confidenceLevel = 1.96    // Z — 95% confidence
): number {
  const p = 0.5;
  const n0 = (Z² × p × (1-p)) / e²;       // infinite population baseline
  const n  = n0 / (1 + (n0 - 1) / N);      // finite population correction
  return Math.ceil(n);
}
```

Demo mode hard cap: 25 records (`Math.min(cochranResult, 25)` when `NEXT_PUBLIC_APP_ENV=local`).

---

## Firestore Setup Notes

- Use the default `(default)` database unless explicitly configured otherwise
- Set `FIRESTORE_PROJECT_ID` in environment to your GCP project ID
- Local dev: connect to live Firestore with a service account JSON (`GOOGLE_APPLICATION_CREDENTIALS`)
- Collections are created automatically on first write — no migrations needed
- Always use `getFirestore()` from `src/lib/firebase-admin.ts` to get the client

---

## Deprecated Collections (v0.1 — do not use in new code)

- `models` — replaced by static `AVAILABLE_MODELS` in page.tsx
- `weightPresets` — replaced by `PROFILES` in page.tsx
- `inferenceLogs` — not yet re-implemented (future phase)
