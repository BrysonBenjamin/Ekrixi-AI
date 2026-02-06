# Ekrixi AI - Security Architecture

## Three Deployment Modes

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    MODE 1: BACKEND PROXY (PRODUCTION)                       ║
║                          🔒 MOST SECURE 🔒                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────┐         ┌──────────────┐         ┌─────────────┐
    │   Browser   │         │   Backend    │         │   Gemini    │
    │             │ ──────> │   Server     │ ──────> │     API     │
    │  (React)    │  HTTPS  │  (Express)   │  HTTPS  │             │
    └─────────────┘         └──────────────┘         └─────────────┘
                                   │
                                   │ 🔐
                            ┌──────┴───────┐
                            │  API Key     │
                            │  (Secret)    │
                            └──────────────┘

    ✅ API key never exposed to clients
    ✅ Rate limiting (100 req/15min)
    ✅ CORS protection
    ✅ Full cost control
    ✅ Usage monitoring

    Best for: Production deployments, public apps


╔════════════════════════════════════════════════════════════════════════════╗
║                  MODE 2: USER-PROVIDED KEYS (DEMO)                          ║
║                        🔓 USER CONTROLLED 🔓                                ║
╚════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────┐                              ┌─────────────┐
    │   Browser   │                              │   Gemini    │
    │             │ ──────────────────────────> │     API     │
    │  (React)    │         HTTPS                │             │
    └─────────────┘                              └─────────────┘
          │
          │ 🔑
    ┌─────┴──────┐
    │ User's Key │
    │ (LocalStorage)
    └────────────┘

    ✅ No backend needed
    ✅ Users pay for their own usage
    ✅ Good for demos and open source
    ⚠️  Users need to get API key
    ⚠️  Higher barrier to entry

    Best for: Open source projects, demos, developer tools


╔════════════════════════════════════════════════════════════════════════════╗
║                    MODE 3: LOCAL LLM (DEVELOPMENT)                          ║
║                       🔒 FULLY PRIVATE 🔒                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

    ┌─────────────┐         ┌──────────────┐
    │   Browser   │         │   Local AI   │
    │             │ ──────> │   Server     │
    │  (React)    │  HTTP   │   (MLX)      │
    └─────────────┘         └──────────────┘
                                   │
                            ┌──────┴───────┐
                            │ Local Model  │
                            │ (On Device)  │
                            └──────────────┘

    ✅ Complete data privacy
    ✅ No API costs
    ✅ Works offline
    ✅ Full control
    ⚠️  Requires local setup
    ⚠️  Limited model capabilities

    Best for: Development, privacy-sensitive apps, offline use


╔════════════════════════════════════════════════════════════════════════════╗
║                         SECURITY COMPARISON                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────┬──────────────┬──────────────┬──────────────┐
│     Aspect      │ Backend Proxy│  User Keys   │  Local LLM   │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Security        │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐       │ ⭐⭐⭐⭐⭐    │
│ Privacy         │ ⭐⭐⭐       │ ⭐⭐⭐⭐     │ ⭐⭐⭐⭐⭐    │
│ Cost (You)      │ 💰💰         │ Free         │ Free         │
│ Cost (User)     │ Free         │ 💰💰         │ Free         │
│ Setup           │ Medium       │ Easy         │ Complex      │
│ User Experience │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐       │ ⭐⭐⭐⭐⭐    │
│ Scalability     │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐    │ ⭐           │
└─────────────────┴──────────────┴──────────────┴──────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                      AUTOMATIC MODE SELECTION                               ║
╚════════════════════════════════════════════════════════════════════════════╝

The app automatically chooses the best mode based on configuration:

    1. Check: Is VITE_USE_LOCAL_LLM=true?
       └─> YES: Use Local LLM Mode
       └─> NO: Continue to step 2

    2. Check: Is VITE_BACKEND_URL set?
       └─> YES: Use Backend Proxy Mode
       └─> NO: Continue to step 3

    3. Check: Is user's API key in localStorage?
       └─> YES: Use User's Key
       └─> NO: Show API key prompt


╔════════════════════════════════════════════════════════════════════════════╗
║                        DEPLOYMENT WORKFLOW                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

PRODUCTION DEPLOYMENT (Backend Proxy):

    1. Deploy Backend to Cloud Run
       ├─> Store API key in Secret Manager
       ├─> Configure CORS
       └─> Note backend URL

    2. Deploy Frontend to Cloud Run
       ├─> Set VITE_BACKEND_URL
       └─> Build and deploy

    3. Configure & Monitor
       ├─> Set up billing alerts
       ├─> Monitor usage logs
       └─> Review security settings


DEMO DEPLOYMENT (User Keys):

    1. Deploy Frontend Only
       ├─> No backend needed
       └─> No API key configuration

    2. Users Provide Keys
       ├─> App prompts for API key
       └─> Stored in browser


DEVELOPMENT (Local):

    1. Backend Proxy Mode:
       ├─> cd backend && npm run dev
       └─> npm run dev (with VITE_BACKEND_URL)

    2. User Keys Mode:
       └─> npm run dev (no backend)

    3. Local LLM Mode:
       ├─> Start MLX server
       └─> npm run dev (with VITE_USE_LOCAL_LLM)


╔════════════════════════════════════════════════════════════════════════════╗
║                          SECURITY CHECKLIST                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Before Production Deployment:

    □ API key stored in Secret Manager (not in code)
    □ Backend deployed with secret reference
    □ CORS configured to specific domain
    □ Rate limiting enabled (✅ already configured)
    □ HTTPS enforced (✅ automatic on Cloud Run)
    □ No VITE_GEMINI_API_KEY in frontend
    □ .env files in .gitignore (✅ already configured)
    □ Billing alerts configured
    □ Monitoring enabled
    □ Security audit completed


╔════════════════════════════════════════════════════════════════════════════╗
║                              QUICK LINKS                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

    📖 DEPLOYMENT.md          - Complete deployment guide
    🔒 SECURITY.md            - Security best practices
    🚀 API_KEY_SECURITY.md    - Quick reference
    📝 IMPLEMENTATION_SUMMARY.md - What was changed
    🔧 backend/README.md      - Backend API docs

```
