# RhythmTyper Tools (Unofficial)

A collection of advanced analysis tools, difficulty calculators, and a web-based editor for **RhythmTyper**.

> **⚠️ Experimental:** This project is in active development (v0.1.0). Features may break, and the internal `.rtm` format handling is subject to change.

## 📦 Modules

### 1. Web Suite (`src/web`)
A comprehensive React application serving as the frontend interface.
*   **Editor:** A full-featured beatmap editor running entirely in the browser using the Origin Private File System (OPFS). Supports multi-difficulty projects, live recording, and real-time hitsound preview.
*   **Calculator:** Drag-and-drop JSON analyzer to visualize strain peaks across 7 distinct skill dimensions (Stream, Jack, Chord, Precision, Ergonomics, Displacement, Stamina).
*   **Leaderboard:** A proposed re-weighting system for player performance points (PP).

### 2. SR Calculator (`src/tools/sr-calculator`)
The core logic engine for difficulty calculation.
*   **Biomechanical Simulation:** Models finger independence, hand alternation, and physical strain.
*   **Pattern Analysis:** Detects complex patterns like rolls, anchors, and one-handed trills.

## 🚀 Getting Started

This project uses **npm workspaces**.

### Prerequisites
*   Node.js 18+

### Installation
```bash
# Install dependencies for all workspaces
npm install
```

### Development
To start the web interface locally:
```bash
# Runs vite dev server at http://localhost:5173
npm run dev
```

### Building
To build the web application for production:
```bash
npm run build
```
The output will be generated in `dist/web`.

## 🛠️ Editor Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Play / Pause |
| **Ctrl + Z** | Undo |
| **Ctrl + Y** | Redo |
| **Ctrl + A** | Select All (Visible Layer) |
| **Shift + Arrow** | Adjust Note Duration (Hold/Tap) |
| **Arrow Keys** | Seek |
| **Q-P / A-; / Z-/** | Place Note (Live Input) |

## 📄 License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.