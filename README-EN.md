<p align="center">
  <img src="assets/oh-my-resume-logo.png" width="150px" alt="Oh My Resume" />
</p>

<h1 align="center">Oh My Resume</h1>

> A Skill-first Markdown resume engine — making your career narrative as readable, editable, and traceable as code.

<p align="center">
  <a href="./README-EN.md"><img src="https://img.shields.io/badge/English-blue" alt="English"></a>&nbsp;
  <a href="./README.md"><img src="https://img.shields.io/badge/中文-red" alt="中文"></a>&nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>&nbsp;
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
</p>

![Oh My Resume example](assets/example.png)

⭐ [Star on GitHub](https://github.com/itxaiohanglover/oh-my-resume) ·
🚀 [Quick start](#quick-start) ·
📝 [Markdown Format](#markdown-format)

---

A truly valuable resume is not a one-off PDF export. It is a living career record — carrying your experiences, judgments, decisions, and growth over time.

Maintaining a resume over the long term demands three core capabilities:

- **Context** — understand the value behind each experience.
  A project is more than a stack of technologies; it is a complete narrative built around problems, decisions, challenges, and results.

- **Iteration** — refine continuously.
  Great resumes are never finished in one sitting. They emerge through feedback, revision, and refactoring.

- **Ownership** — retain full control over your career data.
  Your experience should never be locked inside a platform or template. It should remain readable, editable, traceable, and reusable — forever.

Oh My Resume is built around these three principles:

**Context · Iteration · Ownership**

On this foundation, the **Agent acts as an intelligent collaborator**, participating throughout the resume-building process — from organizing content and refining phrasing to generating the final output — helping turn personal experience into a high-quality career narrative.

<p align="center">
  <em>Workflow demo on Windows</em><br/>
  <img src="assets/workflow-demo-win.gif" alt="Workflow Demo" />
</p>

---

## Why Oh My Resume?

This space already has many mature products, each solving different problems. Oh My Resume doesn't try to replicate an online resume builder — it takes a different path: **local, free, programmable, and deeply collaborable with AI Agents.**

|          | [WonderCV](https://www.wondercv.com/) | [LaoYu Resume](https://www.laoyujianli.com/) | [OneResume](https://github.com/virantha/one_resume) | LaTeX Templates | **Oh My Resume** |
| :------: | ------------------------------------- | ---------------------------------------- | --------------------------------------------------- | :------------: | ---------------- |
| Core Positioning | Online resume builder | Online resume builder | Source-driven resume generation | Document typesetting | **Markdown Resume Engineering System** |
| Content Source | Platform data | Platform forms | YAML data | TeX source | **Markdown files** |
| Content Editing | Visual editor | Form-based | Data configuration | Manual authoring | **Markdown + Agent collaboration** |
| Generation Pipeline | Edit → Export | Edit → Export | Data → Template → PDF | TeX → PDF | **Markdown → Skill → XeLaTeX → PDF** |
| Version Control | Platform saves | Platform saves | File-based | Git optional | **Git-native** |
| Content Iteration | Per-application | Quick edits | Template reuse | Typesetting tweaks | **Long-term maintenance** |
| Style Control | Template selection | Template config | Template modification | TeX customization | **JSON-driven configuration** |
| Data Ownership | Platform-managed | Platform-managed | Local files | Local files | **Local files, free to fork** |
| AI Capability | Content generation | Copy optimization | No native AI | None | **Agent understands context and assists refinement** |

##  Quick Start

Install this repository as a Codex or Claude Code Skill:

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

If your tool requires an Agent restart, restart once after installation.

###  Agent Workflow

Oh My Resume is not an online editor — it lets your Agent participate directly in the resume-building process:

```
Use $oh-my-resume to create my resume PDF from resume.md.
```

The Agent automatically:

- Checks Node.js, XeLaTeX, and latexmk environments;
- Reads the Markdown resume content;
- Generates styles according to configuration;
- Renders the PDF;
- Reports output paths and build information.

Debug mode:

```
Use $oh-my-resume to debug resume.md.
```

Launches a local preview environment for rapid content and style iteration.

###  Windows First-Time Setup

Windows users should prepare the local TeX environment before generating a PDF for the first time:

```bat
cd assets\oh-my-resume
install.bat
```

`install.bat` invokes `scripts\install.ps1`, refreshes the TeX path visible to the current process, persists `OMR_TEX_PATH` for future terminal sessions, and runs `node scripts\cli.js doctor`. The script prefers an existing MiKTeX or TeX Live installation.

PowerShell / CI can run directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -PersistUserEnv -VerifyPdf
```

---

##  Markdown Format

Oh My Resume uses Markdown as the single source of truth.

Example:

```md
### Project Title`Tag` <right>Jan 2025 - Aug 2025</right>

- Project description
  - Technical details
    - Quantified results
```

Supports:

- `##` for resume sections
- `###` for experience entries
- `` `Tag` `` for rendered tags
- Custom tag rendering and text alignment
- `-` multi-level list auto-mapping
- `**bold**` for emphasis
- `[text](link)` preserved as clickable links

---

##  Configuration System

All visual parameters are controlled through `omr.config.json`.

Includes: fonts, page margins, line spacing, theme colors, image dimensions, and more.

Example:

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

### Configuration Priority

Oh My Resume reads local configuration from the current working directory in this order:

1. CLI argument `--config path/to/config.json`
2. Current directory `omr.config.json`
3. Skill default configuration

> Skill updates will never overwrite your current resume style. As long as `omr.config.json` stays in your resume directory, it takes priority over built-in defaults.

### Local Style Templates

Save frequently-used styles under `omr.styles/` in the current directory:

```text
omr.styles/
  current-comfort.json
  compact.json
  interview.json
```

The Debug page's "Style Settings → Template" picker only reads local templates from the current directory. Without `omr.styles/*.json`, the dropdown shows an empty state. You can also enter any relative path in the "Config Path" field, for example:

```text
omr.styles/current-comfort.json
```

Or click "Open Folder" to select a folder containing JSON config files — the page will read and apply the configuration. Applying a template only merges `theme` and `markdown` settings; it never modifies the Markdown content, input path, or output path.

---

##  Requirements

The Skill auto-checks:

-  Node.js 18+
-  XeLaTeX
-  latexmk

HTML preview does not require TeX. `html-pdf` / "HTML Export PDF" requires Google Chrome, Microsoft Edge, or Chromium installed locally; set this when auto-detection fails:

```bash
export OMR_HTML_PDF_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

###   macOS

```bash
brew install --cask mactex-no-gui
```

###   Windows

- Install [MiKTeX Basic](https://miktex.org/download), or install [TeX Live](https://tug.org/texlive/)
- Install [Strawberry Perl](https://strawberryperl.com/)
- Run `assets\oh-my-resume\install.bat`

###   Ubuntu/Debian

```bash
sudo apt-get install latexmk texlive-xetex texlive-lang-chinese
```

---

##  License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Made with  by the open-source community</sub>
</p>
