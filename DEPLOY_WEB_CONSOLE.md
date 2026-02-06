# 🌐 Deploy to Google Cloud Run (Web Console Method)

## Why This Method?

- ✅ No installation required
- ✅ No Python version conflicts
- ✅ Visual interface (easier for first time)
- ✅ Works immediately

## Prerequisites

1. Google Cloud account (free tier available)
2. Credit card for verification (won't be charged on free tier)

---

## Step 1: Set Up Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com

2. **Create a new project**:
   - Click the project dropdown at the top
   - Click "New Project"
   - Name: `ekrixi-ai` (or your choice)
   - Click "Create"

3. **Enable billing** (required for Cloud Run, but free tier is generous):
   - Go to Billing
   - Link a payment method
   - Don't worry: Free tier includes 2M requests/month

---

## Step 2: Enable Required APIs

1. **Search for "Cloud Run" in the top search bar**
2. Click "Enable" if prompted
3. **Search for "Secret Manager"**
4. Click "Enable" if prompted

---

## Step 3: Store Your API Key Securely

1. **Go to Secret Manager**:
   - Search "Secret Manager" in top bar
   - Click "Create Secret"

2. **Create the secret**:
   - Name: `gemini-api-key`
   - Secret value: `AIzaSyDHQ9L1vAUzBUxuXbUcIq7XX9L5800rFNU`
   - Click "Create Secret"

3. **Note**: This keeps your API key secure and never exposed!

---

## Step 4: Prepare Backend for Deployment

### Option A: Deploy from Local Files (Easiest)

1. **Create a ZIP of your backend folder**:

   ```bash
   cd /Users/brysonbenjamin/Projects/Ekrixi-AI
   cd backend
   zip -r backend.zip . -x "node_modules/*" -x ".env"
   ```

2. **The ZIP will be at**: `backend/backend.zip`

### Option B: Push to GitHub (Recommended for Updates)

1. **Create a GitHub repository** for Ekrixi-AI
2. **Push your code**:
   ```bash
   git add .
   git commit -m "Add backend proxy"
   git push
   ```

---

## Step 5: Deploy Backend to Cloud Run

### Using Local ZIP:

1. **Go to Cloud Run**: https://console.cloud.google.com/run

2. **Click "Create Service"**

3. **Configure deployment**:
   - **Deployment method**: "Deploy one revision from an existing container image" → Click "Upload"
   - Upload your `backend.zip` file
   - Or choose "Continuously deploy from a repository" if using GitHub

4. **Service settings**:
   - **Service name**: `ekrixi-ai-backend`
   - **Region**: `us-central1` (or closest to you)
   - **CPU allocation**: "CPU is only allocated during request processing"
   - **Autoscaling**: Min 0, Max 10

5. **Authentication**:
   - Select: **"Allow unauthenticated invocations"**

6. **Container settings**:
   - **Port**: `8080`
   - Click "Container, Variables & Secrets, Connections, Security"

7. **Add Environment Variables**:
   - Click "Variables & Secrets" tab
   - Click "Reference a Secret"
   - Select: `gemini-api-key`
   - Reference as: `GEMINI_API_KEY`
   - Click "Done"

8. **Add more environment variables**:
   - Click "Add Variable"
   - Name: `PORT`, Value: `8080`
   - Name: `FRONTEND_URL`, Value: `*` (we'll update this later)

9. **Click "Create"**

10. **Wait for deployment** (2-3 minutes)

11. **Copy the service URL** (e.g., `https://ekrixi-ai-backend-xxxxx-uc.a.run.app`)

---

## Step 6: Test Your Backend

1. **Open the URL in your browser**: `https://your-backend-url.run.app/health`

2. **You should see**:

   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-06T..."
   }
   ```

3. **Test the API** (optional):
   ```bash
   curl -X POST https://your-backend-url.run.app/api/generate-text \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Say hello!"}'
   ```

---

## Step 7: Prepare Frontend for Deployment

1. **Create production environment file**:

   ```bash
   cd /Users/brysonbenjamin/Projects/Ekrixi-AI

   cat > .env.production << EOF
   VITE_BACKEND_URL=https://your-backend-url.run.app
   VITE_GOOGLE_CLIENT_ID=412518375747-6hib28eca6dm7t6pu0qff69illhpgv3p.apps.googleusercontent.com
   VITE_ENABLE_SSO=true
   EOF
   ```

   **Replace `your-backend-url.run.app` with your actual backend URL!**

2. **Build the frontend**:

   ```bash
   npm run build
   ```

3. **Create a ZIP of the dist folder**:
   ```bash
   cd dist
   zip -r ../frontend.zip .
   cd ..
   ```

---

## Step 8: Deploy Frontend to Cloud Run

1. **Go back to Cloud Run**: https://console.cloud.google.com/run

2. **Click "Create Service"** again

3. **Configure deployment**:
   - Upload `frontend.zip`
   - Or use the existing Dockerfile

4. **Service settings**:
   - **Service name**: `ekrixi-ai-frontend`
   - **Region**: `us-central1` (same as backend)
   - **Authentication**: "Allow unauthenticated invocations"

5. **Container settings**:
   - **Port**: `80` (nginx default)

6. **Click "Create"**

7. **Copy the frontend URL** (e.g., `https://ekrixi-ai-frontend-xxxxx-uc.a.run.app`)

---

## Step 9: Update CORS Settings

1. **Go back to your backend service** in Cloud Run

2. **Click "Edit & Deploy New Revision"**

3. **Update environment variables**:
   - Change `FRONTEND_URL` from `*` to your actual frontend URL
   - Example: `https://ekrixi-ai-frontend-xxxxx-uc.a.run.app`

4. **Click "Deploy"**

---

## Step 10: Test Your Deployment! 🎉

1. **Open your frontend URL** in a browser

2. **Your app should load** and use the backend proxy automatically!

3. **Check that**:
   - ✅ App loads correctly
   - ✅ AI features work
   - ✅ No API key prompts (using backend)
   - ✅ No errors in browser console

---

## 💰 Cost Estimate

- **Cloud Run**: Free tier = 2M requests/month
- **Gemini API**: Free tier = 1,500 requests/day
- **Secret Manager**: First 10,000 operations free

**Most small apps stay completely free!**

---

## 🔒 Security Checklist

- ✅ API key stored in Secret Manager (not in code)
- ✅ CORS configured to specific frontend domain
- ✅ Rate limiting enabled (in backend code)
- ✅ HTTPS enforced (automatic on Cloud Run)
- ✅ No sensitive data in git repository

---

## 🆘 Troubleshooting

### Backend won't deploy:

- Check that `backend.zip` includes `package.json`, `src/`, `Dockerfile`
- Verify Secret Manager secret is named exactly `gemini-api-key`
- Check logs in Cloud Run console

### Frontend can't connect to backend:

- Verify `VITE_BACKEND_URL` in `.env.production` is correct
- Check CORS settings in backend
- Look at browser console for errors

### "No capacity" errors:

- Try a different region (e.g., `us-east1`, `europe-west1`)

---

## 📚 Next Steps

1. **Set up custom domain** (optional)
2. **Configure monitoring and alerts**
3. **Set up CI/CD** with GitHub Actions
4. **Add authentication** if needed

---

## ✅ You're Done!

Your Ekrixi AI app is now:

- ✅ Deployed to production
- ✅ Secure (API key on server)
- ✅ Scalable (auto-scales with traffic)
- ✅ Cost-effective (free tier)

**Congratulations!** 🎉
