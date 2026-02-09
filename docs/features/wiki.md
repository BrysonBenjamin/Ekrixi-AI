# Wiki & Encyclopedia

The `wiki` feature is the primary interface for consuming and detailing the world's lore. It transforms raw registry data into a high-fidelity, presentation-ready manifest.

## Overview

`WikiFeature.tsx` provides a seamless transition between "Note-taking" and "Encyclopedia Publication". It is the final destination for structured lore.

## Feature Modes

### 1. Registry View (Directory)

The root entry point, displaying all units in a clean, categorized directory format for easy browsing.

### 2. Note Mode

The primary detailing environment. Users can edit prose content, attributes, and tags. It features the "Markdown Toolbar" for integrated cross-linking via `[[ ]]` syntax.

### 3. Encyclopedia Mode

An AI-powered generator that synthesizes the unit's gist, prose, and relationships into a professional, narrative-style article.

- **Weaving Protocol**: Displays the system instruction used to generate the current article version.
- **Commit to Registry**: Allows the user to save the generated encyclopedia entry as a separate, persistent record from the standard prose note.

## Immersive Elements

- **Ambient Backgrounds**: AI-generated conceptual art that dynamically adapts to the unit's title and category. These backgrounds are blurred and blended to create a unique mood for each page.
- **Breadcrumb Navigation**: Tracks the user's scrying history, allowing for logical backtracking through the world's web.

## Advanced Detailing

- **Section Scrolling**: Automatic table-of-contents generation based on the unit's complexity and hierarchy.
- **Relationship Context**: Displays connected units directly within the wiki page, encouraging exploration of the nexus.

## Developer Notes

Encyclopedia generation uses the `GEMINI_MODELS.PRO` model with high-fidelity system instructions styled as "The Grand Chronicler of the Ekrixi AI Nexus."
