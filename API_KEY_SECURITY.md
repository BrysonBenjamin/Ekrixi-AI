# 🔐 API Key Security - Quick Reference

## Current Status

Your Ekrixi AI application now supports **three secure deployment modes**:

### 🎯 Quick Decision Guide

**For Production (Recommended):**

```bash
✅ Use Backend Proxy Mode
- Your API key stays secure on the server
- Users can't see or steal your key
- Full cost control and monitoring
```

**For Open Source / Demos:**

```bash
✅ Use User-Provided Keys Mode
- Users enter their own API keys
- You don't pay for API usage
- No backend needed
```

**For Development:**

```bash
✅ Use Local LLM Mode (optional)
- Complete privacy
- No API costs
- Works offline
```

## 🚀 Quick Start

### Option 1: Run with Backend Proxy (Secure)

```bash
# 1. Set up backend
cd backend
npm install
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm run dev

# 2. In another terminal, run frontend
cd ..
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local
npm install
npm run dev
```

### Option 2: Run with User Keys (No Backend)

```bash
# Just run the frontend
npm install
npm run dev

# Users will be prompted to enter their own API key
```

### Option 3: Use the Quick Start Script

```bash
chmod +x start.sh
./start.sh
# Follow the interactive prompts
```

## 📦 What Was Changed

### New Files Created:

1. **`backend/`** - Secure API proxy server
   - `src/index.ts` - Express server with Gemini API proxy
   - `package.json` - Backend dependencies
   - `Dockerfile` - Container configuration
   - `README.md` - Backend documentation

2. **`DEPLOYMENT.md`** - Complete deployment guide for Google Cloud Run

3. **`SECURITY.md`** - Detailed security documentation

4. **`start.sh`** - Interactive quick start script

5. **`src/components/shared/ApiKeyPrompt.tsx`** - Beautiful UI for API key input

### Modified Files:

1. **`src/config.ts`** - Added backend proxy configuration
2. **`src/features/system/hooks/useLLM.ts`** - Support for all three modes
3. **`.env.local`** - Removed hardcoded API key (security fix)
4. **`.env.example`** - Updated with new options

## 🔒 Security Status

### Before (❌ INSECURE):

```javascript
// API key embedded in JavaScript bundle
const apiKey = 'AIzaSy...'; // Anyone can see this!
```

### After (✅ SECURE):

```javascript
// Option 1: Backend proxy (key on server)
fetch('https://your-backend.run.app/api/generate-text');

// Option 2: User provides their own key
const userKey = localStorage.getItem('apiKey');

// Option 3: Local LLM (no external API)
fetch('http://localhost:8080/v1/chat/completions');
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - How to deploy to Google Cloud Run
- **[SECURITY.md](./SECURITY.md)** - Security architecture and best practices
- **[backend/README.md](./backend/README.md)** - Backend API documentation

## 🎯 Next Steps

### For Local Development:

1. Choose your preferred mode (backend proxy or user keys)
2. Run `./start.sh` or follow manual setup above
3. Start building!

### For Production Deployment:

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Deploy backend to Google Cloud Run
3. Deploy frontend to Google Cloud Run
4. Configure CORS and secrets
5. Monitor usage and costs

## ❓ FAQ

**Q: Is my API key secure now?**
A: If you use backend proxy mode, YES! The key never leaves your server.

**Q: Can I still use my own API key directly?**
A: Yes, but only for local development. Never deploy with `VITE_GEMINI_API_KEY` in production.

**Q: What happens if I deploy without the backend?**
A: Users will be prompted to enter their own API keys. This is secure but requires users to have their own keys.

**Q: How much does the backend cost?**
A: Google Cloud Run has a generous free tier (2M requests/month). Most small apps stay free.

**Q: Can I use both modes?**
A: Yes! The app automatically detects if a backend is available and uses it. If not, it prompts for user keys.

## 🆘 Troubleshooting

**Backend won't start:**

```bash
cd backend
npm install
# Make sure .env has GEMINI_API_KEY set
npm run dev
```

**Frontend can't connect to backend:**

```bash
# Check .env.local has the correct backend URL
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local
npm run dev
```

**API key prompt not showing:**

```bash
# Clear backend URL to use user-provided keys
rm .env.local
npm run dev
```

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Deployment Modes                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Mode 1: Backend Proxy (Production)                     │
│  ┌──────┐      ┌─────────┐      ┌──────────┐          │
│  │ User │ ───> │ Backend │ ───> │  Gemini  │          │
│  └──────┘      │ (Secure)│      │   API    │          │
│                └─────────┘      └──────────┘          │
│                     ↑                                   │
│                 API Key                                 │
│                (Secret)                                 │
│                                                          │
│  Mode 2: User Keys (Open Source)                        │
│  ┌──────┐                       ┌──────────┐          │
│  │ User │ ──────────────────> │  Gemini  │          │
│  └──────┘                       │   API    │          │
│     ↑                            └──────────┘          │
│  Own Key                                                │
│                                                          │
│  Mode 3: Local LLM (Development)                        │
│  ┌──────┐      ┌──────────┐                            │
│  │ User │ ───> │ Local AI │                            │
│  └──────┘      └──────────┘                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎉 You're All Set!

Your Ekrixi AI application is now secure and ready for deployment. Choose the mode that best fits your needs and start building!

For questions or issues, check the documentation or open an issue on GitHub.
