<div align="center">
  <img src="assets/logo_new.svg" width="100px" alt="Oh My Resume" />
  <h1>Oh My Resume</h1>
  <p>AI-Powered Markdown Resume Engineering System</p>
  <p align="center">
  <a href="./README-EN.md"><img src="https://img.shields.io/badge/English-blue" alt="English"></a>
  <a href="./README.md"><img src="https://img.shields.io/badge/中文-red" alt="中文"></a>
</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  </p>
</div>


>  Oh My Resume is a Skill-first Markdown resume system. It's built for people who treat their resume as a long-term asset: your resume shouldn't be locked inside a website form — it should be as readable, editable, traceable, and reusable as code.

##   Core Philosophy

-  **Markdown is the single source of truth.**
-  **AI Coding Agent collaborates with you to polish content.**
-  **XeLaTeX produces high-quality PDF output.**
-  **Styles are controlled by readable parameters, not drag-and-drop text boxes.**
-  **All files are local, version-controllable, and free to fork.**

![Oh My Resume example](assets/example.png)

<p align="center">
  <em>Workflow demo on Windows (WIP)</em><br/>
  <img src="assets/workflow-demo-win.gif" alt="Workflow Demo" />
</p>

---

##   Design Philosophy

> Most resume tools optimize for the "first export". **Oh My Resume optimizes for the "tenth iteration".**

A great resume isn't a pretty poster — it's a highly compressed career narrative: judgment, trade-offs, projects, evidence, results. The hard part isn't choosing a template; it's deciding what's worth writing, how to make it credible, and how to maintain it as your experience evolves.

That's why Oh My Resume treats your resume as an engineering artifact:

-  **Content is plain text.** Diff, review, rewrite, commit to Git.
-  **Layout is deterministic.** The same Markdown always produces the same PDF.
-  **AI is a collaborator, not a form assistant.** Codex or Claude Code can read your experience, project repos, and context to help rewrite bullets, compress content, adjust layout, and regenerate PDFs.
-  **Styles are explicit parameters.** Fonts, margins, tag colors, heading spacing, photo size, line height — all in `omr.config.json`.
-  **No platform lock-in.** Input is Markdown, output is a standard PDF, the renderer ships with the Skill inside your repo.

---

##   Why Not a Resume Website?

This space has many mature products, each solving different problems. Oh My Resume doesn't try to replicate an online resume builder — it takes a different path: **local, free, programmable, deeply collaborable with AI Agents.**

| Tool | Data Model | Workflow | AI Capability | Ownership | Iteration |
|------|------------|----------|---------------|-----------|-----------|
|  [WonderCV](https://www.wondercv.com/) | Proprietary JSON + templates | Online editor + form fill | AI-assisted content | Platform-bound | Export-focused |
|  [LaoYu Resume](https://www.laoyujianli.com/) | Form / online structure | Template-driven fast generation | Basic AI rewrite | Platform-locked | Weak versioning |
|  [OneResume](https://github.com/virantha/one_resume) | YAML data structure | CLI / template rendering | No native AI | Open-source | Multi-version, not Git-first |
|  LaTeX Templates | TeX source | Manual / compilation | No AI | Fully controllable | High iteration cost |
|  **Oh My Resume** | **Markdown + Config** | **CLI + Agent + Debug UI** | **Agent-native (Codex / Claude)** | **Fully local / forkable** | **Git-first + long-term design** |

Our advantage isn't "the most templates":

-  **Free**: Run locally. No subscription required for core export.
-  **Own your source**: Your resume source belongs to you, not a platform.
-  **Agent-native**: Designed for Codex / Claude Code to read context and continuously optimize.
-  **Markdown-first**: Writing feels like taking notes, not filling forms.
-  **TeX-quality PDF**: Professional-grade output suitable for job applications.
-  **Fully customizable**: Fine-grained control from font size and line height to margin and color — all as precise values.
-  **Versionable**: Every application, every role-specific version tracked in Git.

The goal isn't to beat every resume website on every feature — it's to provide a better workflow for engineers, creators, and high-frequency iterators: text files, repos, automation, review, continuous iteration.

---

##   Quick Start

###   Installation

Install this repo as a Codex or Claude Code Skill. Restart your agent if required.

The repository root is the Skill folder:

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

###   Using an Agent

Just ask your Agent:

```text
Use $oh-my-resume to create my resume PDF from resume.md.
```

The Skill will:

-  Check Node.js, XeLaTeX, latexmk;
-  Initialize a sample resume if needed;
-  Render Markdown to PDF;
-  Place generated TeX and logs under `build/`;
-  Report clear input and output paths.

###   Using CLI

```bash
node assets/oh-my-resume/scripts/cli.js doctor
node assets/oh-my-resume/scripts/cli.js pdf resume.md
```

###   Debug Preview

For iterative editing, launch the local debug page:

```text
Use $oh-my-resume to debug resume.md.
```

The page includes:

-  Left panel: Markdown editor;
-  Right panel: PDF preview;
-  `Render PDF` button — saves Markdown and regenerates the PDF;
-  `Style Settings` button — adjust fonts, spacing, colors, margins, photo size;
-  Free-form numeric input, so values like `10.85pt`, `0.41em` work out of the box.

```bash
node assets/oh-my-resume/scripts/cli.js debug resume.md
```

The debug server runs until you stop the process.

---

##  Features

-  Markdown resume format
-  Bundled CLI — no npm install required
-  One-command PDF output: `resume.md` → `resume.pdf`
-  LaTeX toolchain under `build/`
-  Visual debug editor with live preview
-  CJK-optimized typography
-  Fine-grained style control (pt / mm / em)

---

##   Configuration

Style settings go in `omr.config.json`:

```json
{
  "theme": {
    "colors": {
      "omrTagBg": "232,241,255",
      "omrTagText": "37,99,235",
      "omrSectionBg": "242,242,242"
    },
    "lengths": {
      "omrPageMarginLeft": "8mm",
      "omrPhotoWidth": "2.35cm",
      "omrPhotoHeight": "2.75cm",
      "omrHeaderNameGap": "0.41em",
      "omrSectionAfter": "0.54em"
    },
    "fonts": {
      "omrBodyFont": "TeX Gyre Termes",
      "omrCJKMainFont": "Kaiti SC"
    },
    "sizes": {
      "omrBodyFontSize": "11.2pt",
      "omrBodyLineHeight": "14.5pt",
      "omrSectionFontSize": "12.1pt",
      "omrEntryFontSize": "10.5pt"
    }
  }
}
```

For full theme customization, copy and edit `themes/classic.tex` after initialization.

---

##   Requirements

The Skill auto-checks:

-  Node.js 18+
-  XeLaTeX
-  latexmk

###   macOS

```bash
brew install --cask mactex-no-gui
```

###   Ubuntu/Debian

```bash
sudo apt-get install latexmk texlive-xetex texlive-lang-chinese
```

---

##   License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Made with  by the open-source community</sub>
</p>
