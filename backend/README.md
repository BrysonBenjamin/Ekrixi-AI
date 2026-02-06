# Backend Deployment README

## Local Development

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Run development server:

```bash
npm run dev
```

The server will start on http://localhost:8080

## Google Cloud Run Deployment

### Prerequisites

- Google Cloud SDK installed
- Project created in Google Cloud Console
- Billing enabled

### Deploy Backend

1. Set your project ID:

```bash
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID
```

2. Enable required APIs:

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

3. Build and deploy from the backend directory:

```bash
cd backend
gcloud run deploy ekrixi-ai-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_actual_api_key_here
```

4. Note the service URL that's returned (e.g., https://ekrixi-ai-backend-xxxxx.run.app)

### Deploy Frontend

1. Update frontend environment variables:

```bash
cd ..
# Create .env.production
echo "VITE_BACKEND_URL=https://your-backend-url.run.app" > .env.production
```

2. Build frontend:

```bash
npm run build
```

3. Deploy frontend to Cloud Run:

```bash
gcloud run deploy ekrixi-ai-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Security Best Practices

1. **Use Secret Manager** (recommended):

```bash
# Store API key in Secret Manager
echo -n "your_api_key" | gcloud secrets create gemini-api-key --data-file=-

# Deploy with secret
gcloud run deploy ekrixi-ai-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

2. **Restrict CORS**: Update `FRONTEND_URL` environment variable to your actual frontend URL

3. **Enable authentication** (optional): Remove `--allow-unauthenticated` and set up IAM

## API Endpoints

- `GET /health` - Health check
- `POST /api/generate-text` - Generate text from prompt
- `POST /api/generate-content` - Generate content with chat history

## Environment Variables

- `GEMINI_API_KEY` (required) - Your Google Gemini API key
- `PORT` (optional) - Server port, defaults to 8080
- `FRONTEND_URL` (optional) - Frontend URL for CORS, defaults to allow all
