# Antigravity Flashcards ⚡

[![Co-authored with AI](https://img.shields.io/badge/Co--authored%20with-AI--Assisted-6366f1?style=flat-square)](#)

An elegant, glassmorphic flashcard desktop-friendly web application for practicing languages, studying behavior, or studying anything else. Built using **React (Vite)** on the frontend and **Express.js** on the backend, storing flashcard sets directly inside your directories as human-readable JSON files.

This project is fully vibe coded.

---

## Features

- **Double-Sided 3D Flip Cards**: Flip flashcards beautifully with fluid animations.
- **Session Stats Tracking**: Keep tab on your progress (Total, Seen, Correct/Wrong, and Accuracy percentage) in real-time.
- **Review Missed Cards**: Study summary lists exactly what you got wrong and lets you run a session practicing *only* those missed cards.
- **Configurable Multi-Path Search**: Store flashcard sets anywhere on your machine. The app scans all configured paths and aggregates sets in a single unified dashboard.
- **Dynamic Set Editor**: Add, edit, or delete cards dynamically with text area inputs (for multi-line strings), name your sets, and choose exactly where on your computer to save them.
- **Markdown & LaTeX Math Formatting**: Use Markdown formatting (bold, italics, lists, and inline/block code) and typeset standard LaTeX mathematical formulas using KaTeX.
- **Image Support**: Drag-and-drop, clipboard paste, or upload images directly in the card editor. Images are stored in an asset folder next to the set JSON and are cleaned up automatically when cards or sets are deleted.
- **Interactive Live Preview**: Toggle inline 3D card previews (`👁️`) inside the editor to verify image formatting and sizing before saving.
- **Smart Scroll Focus**: Hovering and scrolling on long cards scrolls the card text wrapper instead of the parent page.
- **Keyboard Shortcuts**: Designed for high-speed training.

---

## Keyboard Shortcuts

### During Card Study
- **`Space`** or **`Enter`**: Reveal/flip the card.
- **`1`** or **`W`**: Mark card as **Wrong / Incorrect** (only active after revealing answer).
- **`2`** or **`R`** or **`C`**: Mark card as **Right / Correct** (only active after revealing answer).

### On the Session Completion Screen
- **`Space`**: Practice **missed cards only** (if you had incorrect answers), or restart the entire session (if you got 100% correct).
- **`1`**: Return to the **Dashboard**.
- **`2`**: Restart the **entire session** (even if you have missed cards).

### In the Card Editor
- **`Alt` + `N`**: Add a new flashcard. This automatically appends a new card row, focuses your cursor on the new **Front (Prompt)** textarea, and scrolls it smoothly into view.

---

## Markdown & Math Syntax

Both the front and back of cards parse standard Markdown formatting and LaTeX equations:

* **Bold Text**: Use `**text**` (accented with your theme's cyan secondary color).
* **Italics**: Use `*text*` or `_text_`.
* **Bullet and Numbered Lists**: Use standard `-`, `*`, or `1.` delimiters.
* **Centered Text**: Wrap text with `->` and `<-` markers (e.g. `-> Centered text <-`) to center-align a paragraph on the card face.
* **Code highlighting**: Use single backticks `` `const x = 5` `` for inline code, or triple backticks (`` ``` ``) for blocks.
* **Inline LaTeX Formulas**: Wrap math expressions in single dollar signs, e.g. `$\sqrt{a^2 + b^2}$`.
* **Block LaTeX Equations**: Wrap larger centered equations in double dollar signs:
  ```latex
  $$ \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi} $$
  ```

---

## How to Run

### Windows (Recommended)
Simply double-click the **`start.bat`** file in this project root. It will:
1. Verify Node.js is installed.
2. Run `npm install` automatically if running for the first time.
3. Automatically launch the application in your default web browser at [http://localhost:5173](http://localhost:5173).
4. Run both frontend and backend servers concurrently.

### Manual Launch (Any OS)
1. Open a terminal in the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Architecture & Storage File System

- **Frontend**: React + Vanilla CSS (port `5173` in development).
- **Backend**: Express.js server (port `3001` in development).
- **Storage Configuration**:
  - Configurations are saved in `config.json` in the root.
  - Flashcard sets are saved as individual JSON files (e.g. `set_1716382945000.json`) under the configured search paths. By default, it uses the `./data` directory in the project workspace.
  - When creating a new set, you can select which directory to save it to or type in a brand new folder path, which will automatically be registered as an active search path.

---

## 🤖 AI Attribution & Development
This project was built in partnership with **Antigravity**, an advanced agentic coding assistant developed by **Google DeepMind**. 
* **How it was built:** The structure, styling (glassmorphism CSS layouts), backend integrations (Express.js 5 compatibility), and Markdown/LaTeX implementations were entirely co-written, debugged, and optimized through pair-programming interactions with AI agents.
* **Vibe-coding ratio:** ~95% AI-generated codebase, guided and refined by human specifications.