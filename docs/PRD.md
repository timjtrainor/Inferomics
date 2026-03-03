# Inferomics — Product Requirements Document

**Document Status:** Draft v1.0
**Author:** Technical Product Management
**Audience:** Engineering, Platform Architecture
**Last Updated:** Feb 28 2026

---

## 1. The Problem We're Solving

Let's be direct: **90% of enterprise AI initiatives are not generating measurable ROI.** That's not a projection, it's what we're seeing across the industry, and it's starting to show up in board-level conversations.

Here's why. Most teams built their first AI products by wrapping a frontier model (GPT-4, Claude, Gemini) behind an API and calling it done. It worked well enough to ship. The problem is those early architecture decisions are now load-bearing walls. With high-token costs and latency baked into every call, no real understanding of what the trade offs are from one model to the other and what model should be tuned to the actual task at hand. There is zero empirical validation that the intelligence being purchased is producing a commensurate return.

CFOs are asking engineering leaders to justify spend. Boards want to see unit economics. And AI product owners are sitting on use cases that were green-lit on the promise of productivity gains that never materialized, or never got measured.

The hypothesis is straightforward: **smaller, more targeted models running on infrastructure like Nebius AI Studio can dramatically reduce cost and latency while maintaining or improving task-specific accuracy.** The teams that figure out how to validate this hypothesis quickly will be the ones that survive the AI budget correction.

---

## 2. Why Teams Are Stuck

You might wonder, if the solution is "use cheaper, better-fit models," why isn't everyone doing it? Here's what we've observed:

**Model evaluation is an expert sport.** The ability to benchmark, compare, and validate multiple models against a specific use case and dataset requires a non-trivial combination of ML infrastructure knowledge, statistical rigor, and engineering capacity. In most organizations, this capability is concentrated in a handful of engineers, and those engineers are already underwater.

**There's no shared language.** Data Scientists speak in perplexity, BLEU scores, and loss curves. Finance speaks in TCO, error rates, and cost per thousand calls. Business stakeholders speak in risk tolerance and cycle time. Nobody has built a translation layer that makes model decisions legible to the people who ultimately own the budget and the risk.

**The tooling doesn't reflect the organizational reality.** Hugging Face, LangSmith, and Weights & Biases are excellent *engineering* tools. But they require engineering fluency to operate. They don't produce the kind of artifact that a Technical Product Manager or VP of Engineering can take into a steering committee and say: *"Here's the model we should run in production, here's why, and here's what it will cost at scale."*

---

## 3. Our Thesis: This is a FinOps Problem

Cloud FinOps changed how organizations think about cloud infrastructure costs. It didn't do this by making finance teams into AWS engineers. It did this by building workflows, dashboards, and shared vocabulary that moved cost ownership from engineering teams into a cross-functional conversation between finance, product, and engineering.

**We're building the same thing for AI inference economics.**

The framing of this tool is not "an ML evaluation platform." It is a **decision-support system** that surfaces the trade-offs in model selection: cost, accuracy, reliability, latency, and puts those trade-offs in a form that business stakeholders can act on. The goal is to democratize a decision that currently lives in a very small room.

A Technical Product Manager running this tool should be able to:

- Define the use case objective (bulk processing vs. real-time interactive vs. autonomous expert work)
- Select the economic levers relevant to their context (projected volume, latency tolerance, error risk cost)
- Run a validated, statistically sound comparison across candidate models
- Walk out of that session with a defensible recommendation

That recommendation should be **durable enough to take to a VP, a CFO, or a Board.** That's the bar.

---

## 4. Product Vision

> **Inferomics** is the Cloud FinOps layer for AI inference, a discovery engine that helps technical teams validate model fit, quantify economic trade-offs, and produce defensible recommendations for model selection at scale.

The product should function in three modes:

1. **Baseline Discovery** — Run a statistically sound, head-to-head comparison of candidate models against a real dataset and use case.
2. **What-If Analysis** — Post-baseline, adjust economic levers (volume, latency tolerance, risk cost) and see how the recommendation changes in real time. This is where the CFO conversation happens.
3. **Playground Tuning** — Deep-dive into individual model behavior with prompt iteration and side-by-side output comparison.

---

## 5. Scope for v1.0 (Baseline Discovery Engine)

### 5.1 In Scope

**Implementation Objective (Profile Selection)**
Teams configure a weighted scoring model based on their use case archetype. The four initial profiles are:

| Profile | Primary Optimization Target |
|---|---|
| Bulk Processor | Cost & Performance (minimize friction at scale) |
| Real-Time Interactive | Latency (hard constraint; speed defines the product) |
| Analytical Agent | Balanced (intelligence vs. resource trade-off) |
| Autonomous Expert | Accuracy (quadratic penalty for errors in high-risk domains) |

Each profile encodes a scoring weight distribution across four dimensions: **Accuracy, Reliability, Cost, and Performance (Latency).**

**Economic Levers**
Three business-level inputs that govern economic scoring:

- **Projected Monthly Volume** — Request scale, used to amortize and project infrastructure spend
- **Latency Tolerance (ms)** — The hard ceiling for acceptable response time
- **Error Risk Cost (per instance)** — The business cost of a model failure or incorrect output

These are deliberately business-level parameters, not ML hyperparameters. This is intentional.

**Model Candidate Pool**
Select 2–5 candidate models from the Nebius AI Studio model catalog. The tool fetches this catalog dynamically, surfacing pricing (per 1M input/output tokens) and context window constraints.

**Data Source & Scientific Sampling**
Rather than running inference across an entire dataset, the engine uses Cochran's formula to derive a statistically representative sample. The margin of error tier is user-selectable:

- **High Accuracy** — 1% margin of error
- **Standard** — 5% margin of error
- **Low** — 10% margin of error

This keeps cost manageable during evaluation while ensuring statistical validity.

**Master System Prompt**
Teams define a single system prompt that applies uniformly across all candidate models. This ensures the evaluation is a fair, controlled comparison.

**Discovery Engine Execution**
The engine submits the sampled dataset against each candidate model and collects:

- Accuracy score (LLM-as-judge, scored 0–100)
- Reliability score (variance across outputs)
- Average latency (ms)
- Total token cost (actual spend against the sample)

**Scoring: TEI and IES**

Two composite scores are surfaced per model:

**Total Economic Impact (TEI)**

```
TEI = Total Token Cost + ((1 - Accuracy) × Volume × Error Risk Cost)
```

This represents the true economic burden of running this model in production — direct API cost plus expected cost of errors at scale.

**Inference Efficiency Score (IES)**

```
IES = (Accuracy × w_acc + Reliability × w_rel) / (Latency_normalized × w_perf + Cost_normalized × w_cost + ε)
```

This is a dimensionless score representing value per unit of resource consumed, weighted by the Implementation Objective profile. The model with the highest IES, in the context of the chosen profile, is the recommended model.

**What-If Panel (Post-Baseline)**
After a baseline run, the user can modify the economic levers and immediately see how the TEI and IES scores shift. No re-inference required — this is a pure recalculation layer. The goal is to enable rapid situational modeling: *"What happens to our model recommendation if volume doubles?"* or *"What if we're willing to tolerate 2x the latency?"*

**Persistence**
All configuration state (objective, levers, prompt, model selection) is persisted via Firestore and linked to a unique Run ID. Baseline results are stored and accessible via URL. This enables async sharing across stakeholders.

### 5.2 Out of Scope for v1.0

- Fine-tuning or RLHF workflows
- Multi-turn or agentic evaluation (single-pass inference only)
- Custom scoring rubrics beyond the four-pillar model
- Organization-level user management / multi-tenancy
- Automated re-baselining or scheduled evaluations
- Cost forecasting integrations (Snowflake, Looker, etc.)

---

## 6. Users and Personas

### Primary: Technical Product Manager / AI Product Owner

Owns the decision of *which model we run in production* but doesn't have the engineering bandwidth to run evaluations themselves. Needs a result they can defend to leadership. Currently dependent on their ML engineering team to answer basic questions about cost and fit.

### Secondary: Staff / Senior Engineer (AI/ML)

Currently the person fielding ad-hoc model evaluation requests. Benefits from having a structured tool that removes the repetitive grunt work and produces a more rigorous output than a one-off Jupyter notebook.

### Tertiary: Engineering Director / VP Engineering

Needs to make resourcing and vendor decisions. Wants to see the trade-off space clearly, not just a single model recommendation. The What-If panel is their surface.

### Audience (Not a User): CFO / Board

The tool's outputs — particularly TEI and What-If scenarios — are designed to produce artifacts legible at this level. This audience does not interact with the product directly.

---

## 7. Success Metrics for v1.0

**Adoption**

- Time-to-first-baseline: A TPM with no ML background can complete their first end-to-end evaluation run in under 20 minutes.
- Return usage: Users run multiple baseline comparisons before making a production or development model decision.

**Decision Quality**

- % of product teams that can articulate a model selection rationale beyond "it's accurate enough" — tracked qualitatively via user interviews.
- Reduction in time-to-model-decision compared to the previous process (target: >50% reduction).

**Business Impact**

- Documented cost savings from teams that shifted from frontier models to right-sized alternatives as a result of a baseline run.
- Target: demonstrate 30–60% inference cost reduction across at least one organization in the initial pilot.

---

## 8. Technical Constraints and Assumptions

- **Inference Provider:** Nebius AI Studio is the primary inference provider for v1.0. Model catalog is fetched dynamically via the `/api/models` endpoint. Pricing is consumed from the catalog response.
- **Evaluation Dataset Format:** `.jsonl` files uploaded to Cloud Storage. Each record is an input/output pair fed to the LLM-as-judge scorer.
- **LLM-as-Judge:** Accuracy scoring is performed by a judge model (configurable) using a standardized rubric against the expected output in the dataset.
- **Sample Size:** Determined at runtime using Cochran's formula. Minimum 30 records enforced for statistical validity.
- **Session Locking:** Once a sample is drawn and a baseline run is initiated, the configuration is locked for that session. This prevents changing the evaluation conditions mid-run and preserves run integrity.
- **Run Persistence:** Each run is stored in Firestore with the full configuration state and results. Run IDs are surfaced in the URL for shareability.
- **Infrastructure:** Next.js 15 application deployed on Google Cloud Run. Firestore for persistence. No persistent server state.

---

## 9. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | Should the LLM-as-judge model be user-selectable, or fixed for v1? | Eng / PM | High |
| 2 | What's the right UX for sharing a baseline run with non-technical stakeholders? | PM / Design | High |
| 3 | How do we handle datasets with no ground-truth expected output? | ML Eng | Medium |
| 4 | What's our approach to run cost caps / guardrails to prevent expensive accidental runs? | Eng | Medium |
| 5 | Should profiles be customizable (user-defined weights) in v1 or v2? | PM | Low |
| 6 | Is there appetite for a "batch export" of What-If scenarios as a PDF for board reporting? | PM / Stakeholders | Low |

---

## 10. Roadmap Signal (v2 and Beyond)

This section is directional, not committed.

- **Multi-tenant organization support** — shared baselines across a team, permission scoping
- **Automated re-baselining** — trigger a re-run when the model catalog pricing changes materially
- **Fine-tune integration** — connect a baseline result to a fine-tuning workflow, with a before/after comparison
- **FinOps integrations** — export baseline results and What-If projections into cost management dashboards
- **Agentic evaluation** — multi-turn, tool-use, and reasoning chain evaluation for autonomous use cases
- **Custom rubric builder** — allow teams to define and weight their own evaluation dimensions

---

*This document is a living artifact. It should be updated as the product evolves, open questions are resolved, and v2 scope is defined. If you have a material disagreement with anything in here, the right move is to open a conversation — not to work around it.*
