---
description: How to deploy the application to Google Cloud Run
---

1. Execute the `gcloud run deploy` command to build and deploy from source.

// turbo
`gcloud run deploy inferomics --source . --region us-central1 --allow-unauthenticated --set-env-vars NEXT_PUBLIC_APP_ENV=production,FIRESTORE_PROJECT_ID=inferomics-demo,FIRESTORE_DATABASE_ID=(default) --port 8080`
