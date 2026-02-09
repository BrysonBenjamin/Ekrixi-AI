# Shared Components & Utilities

The `shared` directory contains reusable UI components and utilities that maintain a consistent design language and functional standard across the entire Ekrixi-AI platform.

## Key Components

### Markdown Toolbar

Located in `MarkdownToolbar.tsx`, this component provides a specialized formatting interface for manuscript and prose editing. Features include:

- **Standard Formatting**: Bold, Italic, Headings, Lists.
- **Wiki Linking**: Single-click insertion of `[[ ]]` wiki links for cross-referencing lore.
- **Focus Management**: Automatically handles textarea selection and focus restoration after applying formats.

### Tutorial System

A context-driven tutorial engine (`TutorialSystem.tsx`) that guides users through complex features like the Drilldown or Refinery. It uses semantic steps anchored to UI elements.

### Stat Cards

`StatCard.tsx` provides high-fidelity metrics displays used in dashboards (e.g., the System feature) to show unit counts, payload sizes, and system health.

## Design tokens

Most shared components utilize the `nexus-accent` and `nexus-essence` CSS variables, ensuring they adapt to theme changes and maintain the "Premium AI" aesthetic.

## Utility Integration

- **ID Generation**: Standardized `generateId()` utility used for all new nexus objects.
- **JSON Validation**: Safe parsing utilities used for processing AI responses and imports.
