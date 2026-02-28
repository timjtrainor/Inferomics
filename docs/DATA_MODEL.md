# Data Model

## Firestore Collections

---

### `models` — Model Benchmark Configs

Each document represents a deployable AI model with its benchmark characteristics.

```typescript
interface ModelConfig {
  id: string;                  // Firestore document ID
  name: string;                // Display name, e.g. "Llama 3.1 70B"
  provider: string;            // e.g. "Nebius"
  description: string;         // One-line description
  costPer1MTokens: number;     // USD, e.g. 0.35
  latencyP50Ms: number;        // Median latency in milliseconds
  accuracyScore: number;       // 0–100, normalized benchmark score
  active: boolean;             // Whether to include in recommendations
  createdAt: Timestamp;
}
```

**Seed Data (use this to populate Firestore on first run):**

| name                  | provider | costPer1MTokens | latencyP50Ms | accuracyScore |
|-----------------------|----------|----------------|-------------|--------------|
| Llama 3.1 8B Instruct | Nebius   | 0.06           | 210         | 62           |
| Llama 3.1 70B Instruct| Nebius   | 0.35           | 480         | 80           |
| Llama 3.1 405B Instruct| Nebius  | 1.20           | 1200        | 92           |
| Mixtral 8x7B Instruct | Nebius   | 0.18           | 290         | 72           |
| Qwen 2.5 72B Instruct | Nebius   | 0.30           | 420         | 81           |

---

### `weightPresets` — Saved Weight Configurations

Stores named presets for the accuracy/latency/cost slider configuration.

```typescript
interface WeightPreset {
  id: string;                  // Firestore document ID
  name: string;                // e.g. "Latency First", "Cost Optimized"
  accuracyWeight: number;      // 0–100
  latencyWeight: number;       // 0–100
  costWeight: number;          // 0–100
  // Note: weights do NOT need to sum to 100 — they are relative priorities
  createdAt: Timestamp;
}
```

**Built-in Presets (seed these):**

| name             | accuracyWeight | latencyWeight | costWeight |
|-----------------|---------------|--------------|-----------|
| Balanced         | 33             | 33            | 33         |
| Accuracy First   | 80             | 10            | 10         |
| Latency First    | 10             | 80            | 10         |
| Cost Optimized   | 20             | 20            | 80         |

---

### `inferenceLogs` — Decision History (optional, add last)

Tracks which model was recommended and selected during a session.

```typescript
interface InferenceLog {
  id: string;
  timestamp: Timestamp;
  weightPresetId?: string;         // Reference to weightPresets doc
  accuracyWeight: number;
  latencyWeight: number;
  costWeight: number;
  recommendedModelId: string;      // Which model won the scoring
  recommendedModelName: string;    // Denormalized for easy display
  projectedCostPer1MTokens: number;
}
```

---

## Scoring Algorithm

This is the core logic. Implement in a shared utility at `src/lib/scoring.ts`.

```typescript
function scoreModels(
  models: ModelConfig[],
  weights: { accuracy: number; latency: number; cost: number }
): (ModelConfig & { score: number })[] {
  // 1. Normalize each metric to 0–1 across all models
  const maxCost = Math.max(...models.map(m => m.costPer1MTokens));
  const minCost = Math.min(...models.map(m => m.costPer1MTokens));
  const maxLatency = Math.max(...models.map(m => m.latencyP50Ms));
  const minLatency = Math.min(...models.map(m => m.latencyP50Ms));

  // 2. Score each model
  return models
    .map(model => {
      const normAccuracy = model.accuracyScore / 100;
      const normLatency = (model.latencyP50Ms - minLatency) / (maxLatency - minLatency);
      const normCost = (model.costPer1MTokens - minCost) / (maxCost - minCost);

      const totalWeight = weights.accuracy + weights.latency + weights.cost;
      const score =
        (weights.accuracy / totalWeight) * normAccuracy +
        (weights.latency / totalWeight) * (1 - normLatency) + // lower latency = better
        (weights.cost / totalWeight) * (1 - normCost);        // lower cost = better

      return { ...model, score };
    })
    .sort((a, b) => b.score - a.score); // highest score first
}
```

The model at index 0 of the returned array is the recommended model.

---

## Firestore Setup Notes
- Use the default `(default)` database unless explicitly configured otherwise
- Set `FIRESTORE_PROJECT_ID` in environment to your GCP project ID
- For local dev: use Firestore emulator OR connect to live Firestore with a service account JSON
- Collections are created automatically on first write — no migrations needed
