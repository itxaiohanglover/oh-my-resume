# Oh My Resume

![Oh My Resume logo](assets/logo.svg)

Oh My Resume is a Skill-first Markdown resume generator. Install the repository as a Codex or Claude Code Skill, edit a Markdown resume, and export a polished same-name PDF.

Write Markdown on the left, render a TeX-quality PDF on the right, and keep the source document simple enough to edit like a normal note.

![Oh My Resume example](assets/example.png)

It is designed for users who want to focus on content:

- Markdown is the source of truth.
- PDF output is generated in the same folder.
- LaTeX files and logs stay under `build/`.
- A browser debug mode provides Markdown editing, PDF preview, and style controls.

## Install

Install this repository as a Skill in Codex or Claude Code, then restart the agent if your tool requires it.

The repository root is the Skill folder:

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

## Use

Ask your agent:

```text
Use $oh-my-resume to create my resume PDF from resume.md.
```

The Skill will:

- check Node.js, XeLaTeX, and latexmk;
- initialize a sample resume when needed;
- render `resume.md` to `resume.pdf`;
- keep generated TeX and logs in `build/`;
- report the exact input and output paths.

Direct CLI usage is also available:

```bash
node assets/oh-my-resume/scripts/cli.js doctor
node assets/oh-my-resume/scripts/cli.js pdf resume.md
```

## Debug Preview

For repeated editing:

```text
Use $oh-my-resume to debug resume.md.
```

The debug page opens locally with:

- Markdown editor on the left;
- PDF preview on the right;
- `Render` button to save Markdown and regenerate PDF;
- `Style` button for fonts, heading sizes, tag colors, margins, and photo sizing;
- automatic shutdown after the browser tab closes.

Direct command:

```bash
node assets/oh-my-resume/scripts/cli.js debug resume.md
```

## Markdown Rules

Use normal Markdown plus a few resume-friendly conventions:

```yaml
---
name: 文艺倾年
theme: classic
avatar:
contacts:
  - 电话：155-0000-0000 | 邮箱：[hello@example.com](mailto:hello@example.com) | 城市：不限
  - 主页：[example.com](https://example.com) | GitHub：[github.com/example](https://github.com/example)
---
```

```md
## 教育经历

### 示例大学 | 软件工程 | 硕士`双一流` `GPA 3.8/4.0` <time>2024年09月 - 2027年06月</time>

## 项目经历

### 智能任务平台 | 分布式调度系统`开源` `高并发` <time>2025年01月 - 2025年08月</time>
技术栈：Java、MySQL、Netty、gRPC

- 使用 **事件驱动架构** 重构任务提交链路。
- 基于分片策略提升集群吞吐并降低尾延迟。
```

Style tokens:

- `#` top-level title
- `##` section title
- `###` resume entry
- `` `tag` `` badge
- `<time>...</time>` right-aligned entry date
- `**text**` strong text
- `[text](url)` link
- any `字段：内容` line under an entry is rendered as a normal field line

## Configuration

Simple style overrides live in `omr.config.json`:

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
      "omrEntryFontSize": "10pt"
    }
  }
}
```

Advanced users can copy and edit `themes/classic.tex` after initialization.

## Requirements

The Skill checks these automatically:

- Node.js 18+
- XeLaTeX
- latexmk

macOS:

```bash
brew install --cask mactex-no-gui
```

Ubuntu/Debian:

```bash
sudo apt-get install latexmk texlive-xetex texlive-lang-chinese
```

## License

MIT
