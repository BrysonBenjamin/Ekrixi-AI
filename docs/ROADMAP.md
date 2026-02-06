# Product Scaling Roadmap

## 1. Foundation & Hygiene (Immediate Priority)

_Objective: Stabilize the build pipeline and standardize the codebase structure for team collaboration._

- [x] **Standardize Build Pipeline**
  - [x] Remove `importmap` and CDN scripts from `index.html`.
  - [x] Install local dependencies for performance and stability.
  - [x] Configure `postcss.config.js` and `tailwind.config.js`.
  - [x] Migrate inline CSS variables from `index.html` to `src/index.css`.

- [x] **Restructure Directory Layout**
  - [x] Create `src/` root directory.
  - [x] Move features/components/utils/hooks to `src/`.
  - [x] Establish `src/core/` and `src/assets/`.
  - [x] Clean up `types.ts`.

- [x] **Code Quality & Tooling**
  - [x] Install and configure **ESLint** and **Prettier**.
  - [x] Set up a `pre-commit` hook (Husky).

- [x] **Theme Engine & UI Polish**
  - [x] Implement semantic theming.
  - [x] Refactor `SystemFeature` into modular architecture.
  - [x] Fix Light Mode visual hierarchy.

## 2. Architecture & State Management (Short-Term)

_Objective: Decouple the monolithic state and improve application performance._

- [x] **State Management Migration**
  - [x] Implement a state management library (**Zustand**).
    - [x] Store 1: `useRegistryStore` (Registry, CRUD operations).
    - [x] Store 2: `useUIStore` (Theme, View, active panels).
    - [x] Store 3: `useRefineryStore` (Batch management).
  - [x] Deprecate prop-drilling of `registry`.

- [x] **Routing System**
  - [x] Replace `App.tsx` conditional rendering with **React Router**.
  - [x] Enable URL-based navigation.
  - [x] Implement layout wrappers (`AppShell`).

## 2.5. Universe Management & Cloud Infrastructure (Completed)

_Objective: Support multiple distinct projects and enable cloud portability._

- [x] **Session Layer (Multi-Tenancy)**
  - [x] Create `useSessionStore` to track universes.
  - [x] Refactor `useRegistryStore` for dynamic hydration.
  - [x] Implement Universe Switcher UI (Create/Delete/Switch).

- [x] **Cloud Uplink (Beta)**
  - [x] Integrate **Google Identity Services (OAuth 2.0)** for SSO.
  - [x] Implement persistent "Sign in with Google" session.
  - [x] Integrate **Google Drive API** for `appDataFolder` access.
  - [x] Implement Push/Pull Sync logic (JSON-based).

## 3. Persistence & Data Integrity (In Progress)

_Objective: Ensure user data is robust locally before cloud sync._

- [ ] **Data Integrity & Validation**
  - [ ] Implement schema validation (Zod) for `NexusObject`.
  - [ ] Create migration mechanism for data format changes.

- [ ] **Advanced Persistence**
  - [ ] Evaluate IndexedDB for larger datasets (currently localStorage).
  - [ ] (Future) Offline-first concurrent editing (CRDTs).

## 4. Narrative Intelligence (Core Phase)

_Objective: Connect the data structures to actual AI generation._

- [ ] **LLM Integration Layer**
  - [x] Create centralized `useLLM` hook (Gemini 1.5).
  - [x] Implement API Key management (Env & User Settings).
  - [ ] Standardize Prompts/Context injection from active Universe.
  - [ ] Connect `Refinery` to LLM for automated structure extraction.
  - [x] Implement "Chat with Universe" in `Playground` (Refactored to `useLLM`).

## 5. Deployment & Testing (In Progress)

_Objective: Professionalize the delivery pipeline._

- [x] **Containerization**
  - [x] Create `Dockerfile` for production builds (Nginx).
  - [x] Configure `nginx.conf` for SPA routing.

- [/] **Testing Strategy**
  - [x] **Unit Testing**: Add `Vitest` for core logic (`utils/ids.ts`).
  - [ ] **Component Testing**: Add `React Testing Library`.
  - [ ] **E2E Testing**: Playwright smoke tests.

- [ ] **CI/CD**
  - [ ] Setup GitHub Actions for build checks.

## 6. Scalability & Performance (Long-Term)

_Objective: Support thousands of nodes._

- [ ] **Graph Optimization**
  - [ ] Virtualize large lists/grids.
  - [ ] Web Worker offloading for graph algorithms.
  - [ ] Code splitting (Lazy loading features).
