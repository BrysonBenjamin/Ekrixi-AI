# Authentication & Engine Configuration

The `auth` feature handles user identities and the initial setup of the AI generation engine. It provides a secure bridge between the user's browser and the backend services.

## Overview

Authentication is handled via the `LoginFeature.tsx` component, which manages a three-step onboarding flow:

1.  **AUTH Stage**: User signs in via Google or as a Guest. Guest mode allows for local exploration without persistent cloud synchronization.
2.  **CONFIG Stage**: The user provides their Gemini API key. Alternatively, if configured by the administrator, they can use a "Community Hub" shared, rate-limited pool.
3.  **SUCCESS Stage**: Final confirmation and workspace synchronization.

## Core Mechanisms

### Auth Context

The feature integrates with `AuthContext` to manage Firebase-based authentication states (`user`, `signInWithGoogle`, `signInGuest`).

### LLM Integration

The `useLLM` hook is utilized to check for existing keys and set the user's configuration preference. The engine supports:

- **Individual Keys**: Highest priority, full performance.
- **Community Hub**: Shared via backend proxy.

### Aesthetics & UX

- **GSAP Animations**: Fluid entry transitions for onboarding steps.
- **Lucide Icons**: Semantic iconography (`Zap`, `Shield`, `Sparkles`, `Lock`) for clear status communication.
- **Responsive Branding**: Professional, architecturally-inspired UI with soft radial gradients and grid overlays.

## Developer Notes

- **Dev Seeding**: In development environments, a "Seed Demo Universe" button is available to quickly populate the registry with sample data for testing.
- **Environment Config**: Relies on `import.meta.env.DEV` and `config.useBackendProxy` for feature flagging.
