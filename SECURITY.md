# 🔐 Security Guide for Ekrixi AI

## Overview

This document explains the security architecture of Ekrixi AI and how to deploy it securely.

## The Problem: Client-Side API Keys

**⚠️ CRITICAL SECURITY ISSUE**: Storing API keys in frontend code is **NEVER** secure.

When you use environment variables like `VITE_GEMINI_API_KEY`, Vite embeds the actual key value directly into your compiled JavaScript bundle. This means:

1. ✅ Anyone can open DevTools in their browser
2. ✅ View your JavaScript source files
3. ✅ Find your API key in plain text
4. ✅ Use your API key for their own purposes
5. ❌ You get charged for their usage

### Example of the Vulnerability

```javascript
// After build, your code looks like this:
const apiKey = 'AIzaSyDHQ9L1vAUzBUxuXbUcIq7XX9L5800rFNU'; // ⚠️ EXPOSED!
```

Anyone can see this in the browser's Network tab or Sources panel.

## The Solution: Three-Tier Security Architecture

Ekrixi AI implements **three deployment modes** to give you flexibility while maintaining security:

### 1. Backend Proxy Mode (🔒 Most Secure - Recommended for Production)

**How it works:**

- API key stored securely on your backend server
- Frontend makes requests to YOUR backend
- Backend makes requests to Gemini API
- Users never see your API key

**Security benefits:**

- ✅ API key never exposed to clients
- ✅ Rate limiting to prevent abuse
- ✅ CORS protection
- ✅ Request logging and monitoring
- ✅ Centralized cost control

**When to use:**

- Production deployments
- Public-facing applications
- When you want to control costs
- When you need usage analytics

**Setup:**

```bash
# Backend stores the key securely
GEMINI_API_KEY=your_secret_key

# Frontend only knows the backend URL
VITE_BACKEND_URL=https://your-backend.run.app
```

### 2. User-Provided Keys Mode (🔓 Secure for Users)

**How it works:**

- No default API key in your app
- Users enter their own Gemini API key
- Key stored in browser's localStorage
- Each user uses their own key

**Security benefits:**

- ✅ You don't pay for API usage
- ✅ No API key to leak from your side
- ✅ Users control their own costs
- ✅ Good for demos and open-source projects

**Limitations:**

- ❌ Users need to get their own API key
- ❌ Higher barrier to entry
- ❌ Users' keys could be exposed if they're not careful

**When to use:**

- Open-source projects
- Educational demos
- When you don't want to pay for API usage
- Developer tools

**Setup:**

```bash
# No VITE_GEMINI_API_KEY
# No VITE_BACKEND_URL
# App will prompt users for their key
```

### 3. Local LLM Mode (🔒 Fully Private)

**How it works:**

- Run a local LLM server (e.g., MLX)
- No external API calls
- All processing happens locally

**Security benefits:**

- ✅ Complete data privacy
- ✅ No API costs
- ✅ No internet dependency
- ✅ Full control over the model

**When to use:**

- Development and testing
- Privacy-sensitive applications
- Offline environments

## Security Best Practices

### ✅ DO:

1. **Use Secret Manager in production**

   ```bash
   gcloud secrets create gemini-api-key --data-file=-
   ```

2. **Configure CORS properly**

   ```javascript
   // Only allow your frontend domain
   FRONTEND_URL=https://your-app.com
   ```

3. **Enable rate limiting** (already configured in backend)
   - 100 requests per 15 minutes per IP
   - Prevents abuse and cost overruns

4. **Monitor usage**

   ```bash
   gcloud run services logs read ekrixi-ai-backend
   ```

5. **Use HTTPS everywhere**
   - Cloud Run provides this automatically

6. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

### ❌ DON'T:

1. **Never commit API keys**

   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Never use VITE\_\* for secrets in production**

   ```bash
   # ❌ BAD - This gets embedded in JavaScript
   VITE_GEMINI_API_KEY=secret_key

   # ✅ GOOD - This stays on the server
   GEMINI_API_KEY=secret_key
   ```

3. **Don't allow all origins in CORS**

   ```javascript
   // ❌ BAD
   origin: '*';

   // ✅ GOOD
   origin: process.env.FRONTEND_URL;
   ```

4. **Don't skip rate limiting**
   - Always protect public endpoints

5. **Don't log sensitive data**

   ```javascript
   // ❌ BAD
   console.log('API Key:', apiKey);

   // ✅ GOOD
   console.log('API Key configured:', !!apiKey);
   ```

## Incident Response

### If Your API Key Is Leaked:

1. **Immediately revoke the key**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Delete the compromised key

2. **Generate a new key**
   - Create a new API key
   - Update your backend configuration

3. **Review usage logs**
   - Check for unauthorized usage
   - Identify the source of the leak

4. **Update Secret Manager**

   ```bash
   echo -n "new_api_key" | gcloud secrets versions add gemini-api-key --data-file=-
   ```

5. **Redeploy services**
   ```bash
   gcloud run services update ekrixi-ai-backend
   ```

## Security Checklist for Production

- [ ] API key stored in Secret Manager
- [ ] Backend deployed with secret reference
- [ ] CORS configured to specific domain
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] No API keys in frontend code
- [ ] No API keys in git repository
- [ ] Monitoring and alerting configured
- [ ] Regular security audits scheduled
- [ ] Dependency updates automated

## Compliance Considerations

### GDPR / Privacy

- User-provided keys: Users control their data
- Backend proxy: You process user data (need privacy policy)
- Local LLM: Fully private, no external data transfer

### Cost Control

- Backend proxy: Set up billing alerts in Google Cloud
- User-provided keys: Users pay their own costs
- Local LLM: No API costs

## Additional Resources

- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Gemini API Security](https://ai.google.dev/docs/api_security)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

## Questions?

If you have security concerns or questions:

1. Review this document
2. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
3. Open an issue on GitHub
4. Never share API keys in issues or discussions!
