# Deployment Guide

## Environments

| Environment | Purpose                         | URL                                      |
|------------|----------------------------------|------------------------------------------|
| Local Dev  | Active development, UI tweaks    | http://localhost:3001                    |
| Production | Live demo for interviewers       | https://inferomics-[hash]-uc.a.run.app  |

No staging. Promote directly from local to production.

---

## Local Development

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Fill in .env.local with your GCP credentials (see below)

# 4. Start dev server on port 3001 (avoids conflict with port 3000)
PORT=3001 npm run dev
```

### Run on a custom port anytime
```bash
PORT=3001 npm run dev
PORT=3002 npm run dev
```

### Verify local is working
Visit `http://localhost:3001` — should redirect to `/inferonomics`.

---

## Google Cloud Setup (One Time)

### Prerequisites
```bash
# Install Google Cloud CLI if not installed
brew install google-cloud-sdk

# Authenticate
gcloud auth login
gcloud auth application-default login

# Create a new project (or use existing)
gcloud projects create inferomics-demo --name="Inferomics Demo"
gcloud config set project inferomics-demo

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=us-central1
```

### Create Service Account (for local dev connecting to live Firestore)
```bash
gcloud iam service-accounts create inferomics-local \
  --display-name="Inferomics Local Dev"

gcloud projects add-iam-policy-binding inferomics-demo \
  --member="serviceAccount:inferomics-local@inferomics-demo.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud iam service-accounts keys create ./service-account.json \
  --iam-account=inferomics-local@inferomics-demo.iam.gserviceaccount.com
```

Then set in `.env.local`:
```
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIRESTORE_PROJECT_ID=inferomics-demo
```

**Never commit `service-account.json`.** It is already in `.gitignore`.

---

## Deploy to Cloud Run

### Deploy from source (recommended, no Docker required locally)
```bash
gcloud run deploy inferomics \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_APP_ENV=production,FIRESTORE_PROJECT_ID=inferomics-demo,FIRESTORE_DATABASE_ID=(default) \
  --port 8080
```

This command:
1. Builds a Docker container using Cloud Build (remote, no local Docker needed)
2. Pushes to Google Artifact Registry
3. Deploys to Cloud Run
4. Returns a public HTTPS URL

**Typical deploy time: 3–5 minutes.**

### Redeploy after changes
```bash
# Same command — Cloud Run handles rollout with zero downtime
gcloud run deploy inferomics --source . --region us-central1 --allow-unauthenticated
```

### Get your live URL
```bash
gcloud run services describe inferomics --region us-central1 --format="value(status.url)"
```

---

## Dockerfile (required for local container testing)

Create `Dockerfile` in project root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
```

Also add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

### Test container locally
```bash
docker build -t inferomics .
docker run -p 8080:8080 \
  -e NEXT_PUBLIC_APP_ENV=production \
  -e FIRESTORE_PROJECT_ID=inferomics-demo \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json \
  -v $(pwd)/service-account.json:/app/service-account.json \
  inferomics
```
Visit `http://localhost:8080`

---

## Iterating: Local → Cloud Workflow

```
1. Make changes locally
2. Test at http://localhost:3001
3. When ready to show interviewers:
   gcloud run deploy inferomics --source . --region us-central1 --allow-unauthenticated
4. Share the Cloud Run URL
```

That's the full loop. One command to go live.

---

## Free Tier Limits (GCP)
- Cloud Run: 2M requests/month, 360K CPU-seconds, 180K GB-seconds — more than enough
- Firestore: 50K reads/day, 20K writes/day, 20K deletes/day, 1GB storage — more than enough
- Cloud Build: 120 build-minutes/day — each deploy uses ~3–5 minutes
