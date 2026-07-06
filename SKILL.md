---
name: oh-my-resume
description: Use when creating, editing, checking, theming, or exporting resumes from Markdown with Oh My Resume. The skill includes a bundled CLI and templates, so users can ask for a resume PDF without installing the npm package first.
---

# Oh My Resume

Use this skill to turn a Markdown resume into a same-folder PDF. The user should mostly see and edit only the Markdown input and final PDF output.

## Priority

Prefer the bundled CLI shipped with this skill. Users do not need to install an npm package.

Find the skill directory from the loaded `SKILL.md` path. The bundled CLI is:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js
```

## Agent Workflow

1. Run environment checks first. On Windows first-run, prefer the bundled setup helper before `doctor`:

```bat
<skill-dir>\assets\oh-my-resume\install.bat
```

Then check the environment:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js doctor
```

If TeX is missing, report the exact install command instead of continuing to PDF:

```bash
brew install --cask mactex-no-gui
```

2. Choose the Markdown resume file explicitly. Do not rely on implicit discovery. By convention:

- `resume.md` generates `resume.pdf`
- `candidate.md` generates `candidate.pdf`
- generated LaTeX stays under `build/`
- LaTeX logs and auxiliary files also stay under `build/`

If the user has no Markdown resume yet, initialize one:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js init .
```

This creates:

- `resume.md`
- `omr.config.json`
- `themes/classic.tex`

3. Edit `resume.md` for content. Keep generated files out of manual edits.

Supported Markdown:

- `#` top-level heading blocks
- `##` sections
- `###` entries, with optional inline tags and right-aligned time:

```md
### Title`tag` <time>2024 - 2025</time>
```
- `时间：` dates and `标签：` badges as compatibility field lines
- any other `xxx：yyy` entry line as a normal field line
- bullets for achievements
- `**bold**`, `` `tag` ``, and Markdown links

4. Generate the PDF by passing the Markdown file:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js pdf resume.md
```

Expected output:

```text
Generated build/resume.tex from resume.md
Generated resume.pdf
```

5. For iterative editing, use debug mode with an explicit file:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js debug resume.md
```

This opens a temporary local browser page with Markdown editing on the left and PDF preview on the right. The user clicks `Render` to save Markdown and regenerate the PDF. When the browser tab closes, the debug session exits automatically.

The debug page also includes a `Style` button. Use it when the user wants to tune fonts, heading sizes, body size, tag colors, section colors, page margins, photo width/height, header gap, or date/tag field names. The button writes standard `omr.config.json`; users may also edit that JSON directly.

Use the advanced `watch` command only when the user explicitly asks for terminal-based file watching.

6. Validate the PDF. If layout is crowded, first shorten Markdown content; then adjust `omr.config.json`; only edit `themes/*.tex` for full custom design.

## Customization

Use `omr.config.json` for simple theme overrides:

```json
{
  "theme": {
    "colors": {
      "omrAccent": "59,130,246",
      "omrTagBg": "232,241,255"
    },
    "lengths": {
      "omrPageMarginLeft": "8mm",
      "omrPhotoWidth": "2.15cm",
      "omrPhotoHeight": "2.55cm",
      "omrHeaderGap": "6mm"
    },
    "fonts": {
      "omrBodyFont": "TeX Gyre Termes",
      "omrCJKMainFont": "Songti SC"
    },
    "sizes": {
      "omrBodyFontSize": "10pt",
      "omrSectionFontSize": "12pt",
      "omrEntryFontSize": "10.5pt"
    }
  },
  "markdown": {
    "dateFields": ["时间", "日期", "date", "dates"],
    "tagFields": ["标签", "tags"]
  }
}
```

Use a custom LaTeX theme only when needed:

```yaml
theme: ./themes/classic.tex
```

## Output Contract

When done, tell the user:

- The Markdown input path.
- The PDF output path.
- Whether environment checks passed.
- Whether debug mode is running, when used.
- Any remaining layout risk, such as content spilling to multiple pages.
