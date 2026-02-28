# Inferomics Antigravity Rules

## Core Directives

As the Antigravity agent, you are empowered to act autonomously to help the user hit their delivery timeline for this 2-day POC:

- **Velocity**: Optimize for clarity and speed of iteration, not perfection.
- **Boundaries**: Strictly adhere to the technology stack and "Out of scope" rules listed below to avoid time-consuming over-engineering.

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 + globals.css (Custom theme already defined)
- Icons: lucide-react only
- Database: Firestore (Google Cloud)
- Deployment: Google Cloud Run

## Design System

- All tokens are defined in `src/app/globals.css`.
- **Do not** use raw hex values in components when a token or CSS class already exists.
- Reusable classes exist for cards (`.decision-card`), sliders (`.custom-slider`), buttons (`.btn-lift`), etc.

## API Route Conventions

- All backend routes live in `src/app/api/[resource]/route.ts`.
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`.

## Data Model

- Core scoring formula compares Cost, Latency, and Accuracy.
- Collections: `models`, `weightPresets`, `inferenceLogs`.
- The scoring logic should return a normalized score based on user weights.

## Scope Boundaries

**In scope:**

- Model comparison with weighted scoring
- Firestore CRUD for model configs
- Save/load weight presets
- Dockerfile + Cloud Run deployment

**Out of scope (do not add):**

- User authentication or login
- File upload or CSV import
- Charts or data visualizations
- CI/CD pipelines
- Any feature not directly related to the cost/latency/accuracy decision engine
