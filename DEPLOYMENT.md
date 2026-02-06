# Ekrixi AI - Deployment Guide

## 🔐 Security Overview

Ekrixi AI now supports **three modes** for API key management:

1. **Backend Proxy (Recommended for Production)** - API key stored securely on server
2. **User-Provided Keys** - Users enter their own API keys (stored in browser)
3. **Local LLM** - For development with local models (MLX, etc.)

## 🚀 Quick Start - Local Development

### Option 1: User-Provided Keys (No Backend)

```bash
# Install dependencies
npm install

# Run frontend only
npm run dev
```

Users will be prompted to enter their own Gemini API key on first use.

### Option 2: With Backend Proxy

```bash
# Terminal 1: Start backend
cd backend
npm install
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm run dev

# Terminal 2: Start frontend
cd ..
npm install
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local
npm run dev
```

## 📦 Production Deployment to Google Cloud Run

### Step 1: Deploy Backend

```bash
cd backend

# Set your project
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Store API key in Secret Manager (recommended)
echo -n "your_gemini_api_key" | gcloud secrets create gemini-api-key --data-file=-

# Deploy backend with secret
gcloud run deploy ekrixi-ai-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest

# Note the service URL (e.g., https://ekrixi-ai-backend-xxxxx.run.app)
```

### Step 2: Deploy Frontend

```bash
cd ..

# Create production environment file
cat > .env.production << EOF
VITE_BACKEND_URL=https://your-backend-url.run.app
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_ENABLE_SSO=true
EOF

# Build frontend
npm run build

# Deploy frontend
gcloud run deploy ekrixi-ai-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 3: Configure CORS (Important!)

Update backend CORS settings to only allow your frontend domain:

```bash
gcloud run services update ekrixi-ai-backend \
  --set-env-vars FRONTEND_URL=https://your-frontend-url.run.app
```

## 🔒 Security Best Practices

### ✅ DO:

- Use backend proxy for production deployments
- Store API keys in Google Secret Manager
- Configure CORS to only allow your frontend domain
- Use HTTPS for all production deployments
- Enable rate limiting (already configured in backend)

### ❌ DON'T:

- Commit `.env` or `.env.local` files with real API keys
- Set `VITE_GEMINI_API_KEY` in production
- Use `--allow-unauthenticated` if you need access control
- Expose backend endpoints without rate limiting

## 🎯 Deployment Modes Comparison

| Mode          | Security   | Cost                  | Setup Complexity | Best For     |
| ------------- | ---------- | --------------------- | ---------------- | ------------ |
| Backend Proxy | ⭐⭐⭐⭐⭐ | Backend hosting costs | Medium           | Production   |
| User Keys     | ⭐⭐⭐     | Free (users pay)      | Low              | Public demos |
| Local LLM     | ⭐⭐⭐⭐⭐ | Free                  | High             | Development  |

## 🧪 Testing Your Deployment

1. **Health Check**:

```bash
curl https://your-backend-url.run.app/health
```

2. **Test API**:

```bash
curl -X POST https://your-backend-url.run.app/api/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, world!"}'
```

## 📊 Monitoring

View logs in Google Cloud Console:

```bash
# Backend logs
gcloud run services logs read ekrixi-ai-backend --limit 50

# Frontend logs
gcloud run services logs read ekrixi-ai-frontend --limit 50
```

## 💰 Cost Estimation

- **Cloud Run**: Free tier includes 2 million requests/month
- **Gemini API**: Free tier includes 1,500 requests/day
- **Secret Manager**: $0.06 per 10,000 access operations

## 🆘 Troubleshooting

### Frontend can't connect to backend

- Check CORS settings in backend
- Verify `VITE_BACKEND_URL` is correct
- Ensure backend is deployed and running

### API key errors

- Verify secret is created: `gcloud secrets list`
- Check backend has permission to access secret
- View backend logs for detailed errors

### Build failures

- Clear node_modules and reinstall
- Check Node.js version (requires >= 18)
- Verify all environment variables are set

## 📚 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
