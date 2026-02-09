# Conceptual Map (Drilldown)

The `drilldown` feature provides a high-fidelity visual interface for navigating the knowledge nexus. It focuses on conceptual relationships and structural hierarchy.

## Overview

The `DrilldownFeature.tsx` component renders an interactive canvas where units of knowledge (nodes) and their associations (links) are displayed. It is designed for deep exploration of lore without overwhelming the user.

## Functional Components

- **Drilldown Canvas**: The primary rendering area for the knowledge graph.
- **Nav Stack**: A breadcrumb-style navigation bar allowing users to track their path through the hierarchy and return to the "Origin".
- **Integrity Assistant**: An integrated side panel for resolving structural anomalies during navigation.

## Logic & Filtering

### Visible Node Registry

The feature uses an optimized `useMemo` block to calculate visible nodes based on the current focus. It prevents visual bloat by:

- Limiting depth of traversal (max depth 2).
- Capping total visible nodes at `MAX_DRILLDOWN_NODES` (currently 40).
- Excluding "Story" units (Books, Chapters, Scenes) to keep the view focused on conceptual lore.

### Reification

Users can "promote" semantic or hierarchical links into first-class logic units (Reified Units). This allows relationships themselves to hold metadata, children, and complex descriptions.

### Parentage & Reparenting

Includes built-in cycle detection during drag-and-drop reparenting to ensure the graph remains a Directed Acyclic Graph (DAG).

## Visualization Modes

- **Author Units Toggle**: Users can hide or show "Author's Notes" to separate meta-commentary from the core lore.
- **Path Highlighting**: Nodes are categorized as `descendant`, `ancestor`, `lateral`, or `focus` for distinct visual treatment.
