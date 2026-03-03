# Inferomics — AI Model Discovery Engine

<div align="center">
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Google_Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Cloud Run" />
  <img src="https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firestore" />
  <img src="https://img.shields.io/badge/Nebius_AI-6B4EFF?style=for-the-badge&logo=ai&logoColor=white" alt="Nebius AI" />
</div>

<br />

![Inferomics Discovery Engine Demo](./docs/demo.webp)

---

## Overview

**FinOps-grade model selection for Nebius Token Factory.**

Inferomics is a full-stack POC decision engine that replaces guesswork in AI model selection with quantitative evidence. Given a JSONL dataset, it:

1. **Samples** a statistically valid subset using the Cochran Formula.
2. **Runs** each candidate model simultaneously against that sample via the Nebius Token Factory API.
3. **Scores** each model across four pillars weighted by your team's Implementation Profile.
4. **Presents** ranked results with an **Intelligence Efficiency Score (IES)** for direct comparison.
5. **Enables** per-model tuning via the Playground — adjust system prompts/parameters and re-run.

---

## Why Nebius Token Factory?

Inferomics is built exclusively on the **Nebius Token Factory** to evaluate 40+ leading open-weight LLMs (Llama 3, Mixtral, Qwen, etc.) through a single, unified API.

* **OpenAI-Compatible:** Zero code changes required for inference routing—just swap the `baseURL` and `apiKey`.
* **Standardized Pricing:** Transparent per-million-token pricing allows the Engine to accurately project at-scale costs natively.
* **Massive Candidate Pool:** Test standard instruct models alongside specialized vision, embedding, and safety models head-to-head.

---

## The Scoring Engine

Inferomics evaluates models based on an **Implementation Profile** (Bulk, Real-Time, Analytical, or Autonomous) which dictates the weighting applied to Cost, Latency, Accuracy, and Reliability.

### Profile Weights

| Profile | `n` (Cost Multiplier) | Accuracy Weight | Reliability Weight | Performance Weight | Cost Weight |
|---|---|---|---|---|---|
| **Bulk Processor** | 1.0 | 10% | 10% | 30% | 50% |
| **Real-Time Interactive** | 1.2 | 30% | 10% | 50% | 10% |
| **Analytical Agent** | 1.5 | 40% | 20% | 20% | 20% |
| **Autonomous Expert** | 2.0 | 50% | 35% | 7.5% | 7.5% |

### Total Economic Impact (TEI)

Before standardizing the score, we calculate the estimated financial risk of relying on a model, factoring in token costs and the projected cost of errors:

$$TEI = \text{Total Token Cost} + ((1 - \text{Accuracy}) \times \text{Projected Volume} \times \text{Error Risk Cost})$$

### Intelligence Efficiency Score (IES)

Models require a standardized metric to be ranked fairly. The IES balances the raw quality pillars (Accuracy & Reliability) against the operational pillars (Latency & Cost), normalized against the max values in the candidate pool.

$$IES = \frac{(\text{Accuracy} \times 0.7) + (\text{Reliability} \times 0.3)}{(\frac{\text{Avg Latency}}{\text{Max Latency}}) + (\frac{\text{Cost per 1M}}{\text{Max Cost per 1M}}) + 0.001}$$

---

## Statistical Rigor: Cochran Sampling

Evaluating 10,000 records takes hours and costs dollars; testing on 5 ad-hoc prompts is anecdotal and useless. Inferomics bridges this gap by automatically calculating the minimum statistically valid sample size using the **Cochran Formula**.

$$n_0 = \frac{Z^2 \times p \times q}{e^2}$$
$$n = \frac{n_0}{1 + \frac{n_0 - 1}{N}}$$

Where:

* $Z = 1.96$ (95% confidence level)
* $p = 0.5$ (Maximum variability assumption)
* $e$ = Accuracy tier ($0.01$ High, $0.05$ Standard, $0.10$ Low)
* $N$ = Total dataset size (Finite population correction)

---

## Architecture: Raw-First Persistence

The architecture follows a strict **Raw-First** strategy for LLM responses.

Instead of rolling up Key Performance Indicators (KPIs) in memory, the engine (`/api/inferomics/run`) evaluates and writes **every individual inference response** (including full `raw_output`, `extracted_label`, `latency_ms`, and `usage`) to Firestore in parallel batches.

**Why?**

1. **Versioned Analysis:** If the extraction logic or ground-truth comparison logic changes in the future, the immutable raw outputs can be reprocessed without paying Nebius for redundant inference.
2. **Auditability:** FinOps requires proof. Every pass/fail is completely traceable to the strict prompt/response payload.

---

## Infrastructure: Google Cloud Platform (GCP)

Inferomics relies on GCP for serverless execution and state persistence.

| Component | Purpose | Required IAM Role |
|---|---|---|
| **Cloud Run** | Serverless Next.js container execution | `roles/run.admin` |
| **Cloud Storage** | Storage for user-uploaded JSONL datasets | `roles/storage.objectAdmin` |
| **Firestore** | Session state, model presets, inference runs | `roles/datastore.user` |

> [!TIP]
> **Bucket Naming Convention:** Custom dataset buckets should ideally follow `<project-id>-datastore` to match typical deployments, or simply set the `GOOGLE_CLOUD_STORAGE_BUCKET` env var.

---

## Getting Started

### Prerequisites

* Node.js 18+
* GCP Project with Firestore and Cloud Storage enabled
* Nebius AI Studio API Key (`NEBIUS_API_KEY`)

### 1. Environment Configuration

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | ✓ | `local` or `production` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local | Path to GCP service account JSON key |
| `FIRESTORE_PROJECT_ID` | ✓ | GCP project ID |
| `FIRESTORE_DATABASE_ID` | ✓ | Firestore database name (default: `(default)`) |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | ✓ | Target GCS bucket for JSONL uploads |
| `NEBIUS_API_KEY` | ✓ | Target Nebius Studio token |

### 2. Verify Connectivity

Before starting the server, verify your local environment can successfully handshake with both Firestore and Nebius AI Studio.

```bash
npx tsx scripts/test-connections.ts
```

*(Expect `[SUCCESS]` logs for both Firestore Init, DB Read/Write, and Nebius Chat Completions).*

### 3. Start Development Server

```bash
PORT=3001 npm run dev
```

Open [http://localhost:3001/Inferomics](http://localhost:3001/Inferomics) to access the engine.

---

## API Reference

All routes utilize the Next.js App Router API directory.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/datasets` | List generic dataset metadata |
| `POST` | `/api/datasets/upload` | Upload `.jsonl` directly to Cloud Storage |
| `POST` | `/api/inferomics/sample` | Trigger Cochran sample calculation |
| `POST` | `/api/inferomics/run` | Execute parallel multi-model LLM inference |
| `GET` | `/api/model/[modelId]/capabilities` | Fetch dynamic Nebius config thresholds |
| `GET` | `/api/objective` | Fetch the persisted session configuration |
| `POST` | `/api/objective` | Upsert the unified application AppContext state |
| `POST` | `/api/objective/run/create` | Initialize a new inference sequence in Firestore |
| `GET` | `/api/objective/run/status` | Poll for inference sequence completion state |
| `GET` | `/api/preset` | Fetch Playground configs |
| `POST` | `/api/preset` | Persist an updated Playground config |

---

## Directory Structure

```text
src/
|-- app/
|   |-- Inferomics/
|   |   |-- page.tsx
|   |-- api/
|   |   |-- datasets/
|   |   |   |-- route.ts
|   |   |   |-- upload/
|   |   |       |-- route.ts
|   |   |-- inferomics/
|   |   |   |-- config/
|   |   |   |   |-- route.ts
|   |   |   |-- run/
|   |   |   |   |-- route.ts
|   |   |   |-- sample/
|   |   |       |-- route.ts
|   |   |-- model/
|   |   |   |-- [modelId]/
|   |   |       |-- capabilities/
|   |   |           |-- route.ts
|   |   |-- models/
|   |   |   |-- route.ts
|   |   |-- objective/
|   |   |   |-- route.ts
|   |   |   |-- run/
|   |   |       |-- create/
|   |   |       |   |-- route.ts
|   |   |       |-- status/
|   |   |           |-- route.ts
|   |   |-- preset/
|   |       |-- route.ts
|   |-- data-lab/
|   |   |-- datasets/
|   |       |-- page.tsx
|   |-- inference/
|   |   |-- playground/
|   |       |-- page.tsx
|   |-- layout.tsx
|   |-- page.tsx
|   |-- globals.css
|   |-- favicon.ico
|-- components/
|   |-- PlaygroundModal.tsx
|   |-- UploadModal.tsx
|   |-- layout/
|       |-- Sidebar.tsx
|       |-- TopNav.tsx
|-- context/
|   |-- AppContext.tsx
|-- lib/
|   |-- firebase-admin.ts
|   |-- models.ts
|   |-- statistics.ts
|   |-- utils.ts
|-- services/
    |-- storage.ts
```

---

## Troubleshooting

| Error | Area | Solution |
|---|---|---|
| **`403 Permission Denied`** | **Firestore / GCS** | Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct and the Service Account has `roles/datastore.user` and `roles/storage.objectAdmin`. |
| **`429 Rate Limiting`** | **Nebius Inference** | Depending on the models chosen, Nebius tier limits may be hit during parallel discovery runs. Consider requesting a limit increase on the Nebius console. |
| **`"app/page.tsx cannot be found"`** | **Next.js** | Next.js HMR occasionally freaks out over global Firestore instance singletons. Restart the dev environment: `rm -rf .next && npm run dev` |
| **`CORS Error on /api/...`** | **API Routing** | Ensure requests are hitting relative paths (`/api/...`) rather than full unqualified local domains which trigger standard web security checks. |

---

## Internal Documentation

| Reference | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Jules AI internal config and boundaries |
| [`CLAUDE.md`](./CLAUDE.md) | Claude-specific conventions |
| [`.agent/rules.md`](./.agent/rules.md) | Antigravity execution rules |

---

**License:** Internal demonstration POC only. Not licensed for redistribution.
