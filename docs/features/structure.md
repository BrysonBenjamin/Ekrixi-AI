# Structure Engine

The `structure` feature manages the fundamental hierarchy and organization of all knowledge units in the nexus. It enforces the "Logic vs Narrrative" separation.

## Overview

`StructureFeature.tsx` provides a high-level view of the world's organization, allowing users to build complex, nested hierarchies of entities and concepts.

## Core Capabilities

### 1. Omni-Container Logic

Every unit in the nexus is a potential container. Upon adding a child to a leaf node, the engine automatically promotes it to a `CONTAINER_NOTE`, updating its metadata and structural properties.

### 2. Structural Visualizer

An interactive tree-based visualizer for managing depth and parentage. It supports drag-and-drop reparenting and "shadow link" creation for maintaining hierarchical integrity.

### 3. Logic-Story Filtering

The Structure Engine strictly excludes narrative units (Books, chapters, scenes) to maintain a clean conceptual map of the world's facts and entities.

## Advanced Actions

- **Reification**: Promotion of relationships into logical units.
- **Leaf Promotion**: Manual promotion of notes into containers.
- **Meta-Layer Sequestration**: Users can toggle the visibility of "Author's Notes" to focus purely on the objective world structure.

## Integration

The Structure Engine works in tandem with the Lore Refinery. While the Refinery is for _staging_, the Structure feature is for managing the _permanent_ record of the world's hierarchy.
