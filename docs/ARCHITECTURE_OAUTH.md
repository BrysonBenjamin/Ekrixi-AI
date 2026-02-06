# Architecture Strategy: OAuth & Drive Sync (Beta)

## Overview

For the Beta release, we will bypass complex backend databases and leverage **Google's Ecosystem** as our "Serverless Backend". This allows users to:

1.  **Identity:** Sign in with Google (OAuth 2.0).
2.  **Compute:** Use their own Gemini API quota (Zero infrastructure cost for us).
3.  **Storage:** Sync their Knowledge Registry to their own Google Drive (Zero storage cost for us).

## 1. Authentication Flow (Client-Side Only)

We will use the **Google Identity Services SDK** (GIS) for a lightweight, client-side auth flow.

### Implementation Plan

1.  **Library:** `@react-oauth/google` (Wrapper for Google Identity Services).
2.  **Scopes needed:**
    - `https://www.googleapis.com/auth/drive.file` (Only files created by the app).
    - `openid` (For identity).
    - `email` (For user profile).
3.  **Components:**
    - `AuthProvider`: Context wrapping the app to handle session state.
    - `LoginButton`: "Sign in with Google" component.

## 2. API Key Management

Instead of proxying requests, the client will use the user's Auth Token to authenticate with Google APIs, but for **Gemini**, we still need an API Key strategy.

- **Option A (User Provided):** User pastes their own `GEMINI_API_KEY` into Settings -> LocalStorage.
- **Option B (OAuth Token - Advanced):** If Vertex AI is used, OAuth token suffices. **Current recommendation:** Stick to API Key field for simplicity in Beta.

## 3. Google Drive Sync Adapter

We will implement a `PersistenceAdapter` interface that switches between `LocalStorage` and `GoogleDrive`.

### Logic

- **Save:** `POST /upload/drive/v3/files?uploadType=multipart`
- **Load:** `GET /drive/v3/files?q=name='nexus_registry.json'`

This treats Google Drive as a "Remote File System".

## Technical Stack Additions

- `npm install @react-oauth/google`
- `npm install gapi-script` (for Drive API interaction)
