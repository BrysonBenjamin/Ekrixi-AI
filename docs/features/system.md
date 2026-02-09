# System Administration & Dashboard

The `system` feature provides the administrative control center for the Ekrixi-AI platform. It manages system health, project configuration, and appearance.

## Overview

The `SystemFeature.tsx` component serves as a centralized dashboard, aggregating metadata from the entire world registry and providing management interfaces.

## Dashboard Metrics (Live Stats)

The dashboard provides real-time "Neural Signaling" stats:

- **Active Units**: Total number of nodes in the registry.
- **Neural Links**: Total number of active associations.
- **Volumes**: Total count of logical containers/hierarchies.
- **System Payload**: The total JSON footprint size in KB, highlighting the memory impact.

## Management Panels

### 1. Universe Switcher

Allows users to pivot between different "Manifolds" or project repositories. It manages the loading and switching of registry contexts.

### 2. LLM Settings

Configuration panel for AI model selection and API key management. Users can toggle between proprietary keys and community-pooled resources.

### 3. Theme Selector

Manages the visual profile of the application (e.g., standard dark mode, high-contrast, or experimental "Essence" themes).

### 4. Data Sync & Import

Facility for bulk-importing nexus registries from external JSON sources and performing background synchronization with the cloud.

### 5. Danger Zone

Destructive operations, such as purging the current registry or resetting project state, are sequestered here with required confirmation.

## Developer Notes

Stats are calculated via the `useSystemStats` hook, which performs an O(n) traversal of the registry to compute counts and recursive payload sizes.
