---
name: oh-my-resume
description: Use when creating, editing, checking, theming, or exporting resumes from Markdown with Oh My Resume. The skill includes a bundled CLI and templates, so users can ask for a resume PDF without installing the npm package first.
---

# Oh My Resume

Use this skill to turn a Markdown resume into a same-folder PDF, HTML preview, or source package. The user should mostly see and edit only the Markdown input, local config, and final output.

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
### Title`tag` <right>2024 - 2025</right>
```
- `时间：` dates and `标签：` badges as compatibility field lines
- any other `xxx：yyy` entry line as a normal field line
- bullets for achievements, including nested bullets by indentation:

```md
- Level 1
  - Level 2
    - Level 3
```
- `**bold**`, `` `tag` ``, and Markdown links
- `***` on its own line renders a gray divider between content blocks
- inline company logos with `<logo>alibaba</logo>`
- coloured experience bars with `<color color="blue">...</color>`; `color` accepts configured `gray`, `pink`, `blue`, or a direct `#RRGGBB` / `R,G,B` value
- header school logos through the `schoolLogo` frontmatter field

Built-in logo keys are `alibaba`, `alibaba-cloud`, `bytedance`, `baidu`,
`huawei`, `meituan`, `xiaomi`, `kuaishou`, `alipay`, `taobao`, `apple`,
`google`, `github`, `china-mobile`, `tongyi-lab`, `pinduoduo`, `xiaohongshu`,
`tencent`, `kimi`, `deepseek`, and `trae`. Debug mode lists these at the bottom of Style Settings; selecting one
inserts its tag at the Markdown cursor.

For a local PNG or JPG, either reference it directly:

```md
<logo src="logos/my-company.png">My Company</logo>
```

Or register a reusable key in `omr.config.json` and use the same short syntax:

```json
{
  "logos": {
    "my-company": "logos/my-company.png"
  }
}
```

```md
<logo>my-company</logo>
```

Header school logos accept a built-in tag, a registered key, or a direct path:

```yaml
schoolLogo: <school-logo>uestc</school-logo>
```

```yaml
schoolLogo: logos/my-school.png
```

Built-in school keys are `uestc`, `peking-university`, `southeast-university`,
and `northwestern-polytechnical-university`. Register reusable custom keys in
the top-level `schoolLogos` object. The legacy `logo: logo.png` field remains
supported.

4. Generate the PDF by passing the Markdown file:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js pdf resume.md
```

Expected output:

```text
Generated build/resume.tex from resume.md
Generated resume.pdf
```

For a fast browser preview without TeX compilation, generate HTML:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js html resume.md
```

For users who cannot run TeX, export a fallback PDF from the HTML renderer. This requires Google Chrome, Microsoft Edge, or Chromium; users can set `OMR_HTML_PDF_BROWSER` to an explicit browser executable path when auto-detection fails:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js html-pdf resume.md
```

To export a source package with Markdown, config, generated LaTeX, HTML, and required template sources:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js export resume.md
```

5. For iterative editing, use debug mode with an explicit file:

```bash
node <skill-dir>/assets/oh-my-resume/scripts/cli.js debug resume.md
```

This opens a local browser page with Markdown editing on the left and preview on the right. The user can choose `LaTeX PDF` or `HTML 快速预览`, then click render to save Markdown and regenerate the selected output. The `HTML 导出 PDF` button generates the browser-rendered fallback PDF. The debug session stays running until the terminal process is stopped.

The debug page also includes `Style` and source export controls. Use `Style` when the user wants to tune fonts, heading sizes, body size, tag colors, section colors, page margins, photo width/height, inline logo height, header gap, or date/tag field names. The bottom of Style Settings lists built-in logos and local logo mappings. The button writes standard `omr.config.json`; users may also edit that JSON directly.

Style Settings can export the current configuration as one `omr.config.json`
file. "Import and replace" atomically replaces the active configuration in the
current resume folder.

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
      "omrHeaderGap": "6mm",
      "omrNameMarginTop": "0em",
      "omrNameMarginBottom": "0.41em",
      "omrContactMarginTop": "0.1em",
      "omrContactMarginBottom": "0.1em",
      "omrLogoMarginTop": "0mm",
      "omrLogoMarginBottom": "0mm",
      "omrDividerGap": "0.3em"
    },
    "fonts": {
      "omrBodyFont": "TeX Gyre Termes",
      "omrCJKMainFont": "Songti SC"
    },
    "sizes": {
      "omrBodyFontSize": "10pt",
      "omrNameFontSize": "16.9pt",
      "omrContactFontSize": "10pt",
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

The named `<color color="gray|pink|blue">` backgrounds are configurable through `theme.colors`:
`omrColorGrayBg`, `omrColorPinkBg`, and `omrColorBlueBg`. Text and dates keep
the same colours as ordinary experience entries.

Use a custom LaTeX theme only when needed:

```yaml
theme: ./themes/classic.tex
```

## Output Contract

When done, tell the user:

- The Markdown input path.
- The PDF output path.
- The HTML/source output path, when used.
- Whether environment checks passed.
- Whether debug mode is running, when used.
- Any remaining layout risk, such as content spilling to multiple pages.
