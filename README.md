<div align="center">

# Ekrixi-AI

### Professional AI-Driven Worldbuilding & Story Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## ⚡ Overview

**Ekrixi-AI** is a high-performance, AI-native forge for writers and worldbuilders. It transforms raw ideas into structured lore, maintains graph integrity across massive universes, and provides a professional studio for manuscript development.

## 📖 The Inspiration

This project was born out of a desire to help my sister expand her novel and manage her world's notes more effectively. While exploring LLMs for my own writing, I found that standard chatbot interfaces lacked the **contextual specificity** needed for complex worldbuilding. Prompts became "monolithic" and long-winded just to remind the AI of basic facts.

Ekrixi-AI solves this by treating worldbuilding like software engineering—using **nodic memory** to provide the AI with precise, referencable "memories" rather than a single massive text dump.

## 🧠 How it Works: Nodic Memory

Ekrixi AI utilizes an **Atomic Nodic Memory** system powered by Gemini to quickly synthesize information into condensed notes.

- **Zettelkasten Inspired**: Information is synthesized into atomic notes with descriptive, semantic links, similar to Obsidian.
- **Hierarchical & Semantic**: Supports both flexible semantic links (mentions, basic relationships) and strict hierarchical links (folders, containers).
- **Reification**: Links are not just connections; they are objects. You can "reify" a link—like the relationship between two countries—into its own entity ("The War"), which then hosts its own sub-notes (battles, treaties).
- **Story-Studio Integration**: The main tool for utilizing this node structure. It allows authors to create thematic blocks and store author's notes as individual, referable memories. A dedicated chatting assistant helps write the novel using these specific memories as context.

## 🚀 Core Features

- **Professional Story Studio**: Multi-stage manuscript writing with a "Narrative Spine" manager.
- **Universe Generator**: Conversational AI interface for real-time world-building and node creation.
- **AI Scanner & Lore Refinery**: Automated extraction and reconciliation of lore from raw text into structured units.
- **Conceptual Map (Drilldown)**: High-fidelity visual navigation of the knowledge graph (mind-map and tree views).
- **Graph Integrity Engine**: Foundational hierarchy manager ensuring stable, cycle-free knowledge units.

## 🛡️ Security Architecture

Ekrixi-AI implements a **Dual-Mode Security** system to protect your Gemini API keys:

1.  **Backend Proxy (Recommended)**: Secure Express server (Node.js/GCP) that proxies requests, keeping keys server-side.
2.  **User-Provided Keys**: Client-side mode where users provide their own keys, stored securely in `localStorage`.

## 🛠️ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Gemini API Key](https://aistudio.google.com/app/apikey)

1.  **Install & Setup**:

    ```bash
    npm install
    cp .env.example .env.local  # Add your VITE_GEMINI_API_KEY
    ```

2.  **Run Development Server**:

    ```bash
    npm run dev
    ```

3.  **Run Secure Backend (Optional)**:
    ```bash
    cd backend && npm install && npm run dev
    ```

## 🗺️ Roadmap & Next Steps

### Major Priority

- **SQL Scaling**: Creating a dedicated SQL database for universes and chats for better future scaling.
- **Monetization**: Scaling into a pro tier for advanced story creation.
- **Visual Improvements**: Fixing reification UI and refining the drill-down graphic interface.

### Medium Priority

- **Efficiency**: Creating non-LLM solutions for simple tasks to increase speed and decrease cost.
- **Multimedia**: File and image uploads for a more advanced chat system.
- **Agentic Polishing**: Fixing visual bugs for streaming AI agentic responses.

---

## 🏗️ Built With

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Firebase Tools
- **Deployment**: Google Cloud Build & Google Cloud Run
- **AI Engine**: Google Gemini Pro

---

<div align="center">
View the live app: [Ekrixi AI]([https://ai.studio/apps/drive/1zx_eLA_1BaARWuImBFQBbgEC6EMX38El](https://ekrixi-ai-412518375747.us-central1.run.app/nexus))
</div>
