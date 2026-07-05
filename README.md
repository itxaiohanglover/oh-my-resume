<div align="center">
  <img src="assets/logo_new.svg" width="100px" alt="Oh My Resume" />
  <h1>Oh My Resume</h1>
  <p>基于 Markdown 的 AI 驱动简历工程化系统</p>
</div>

Oh My Resume 是一个 Skill-first 的 Markdown 简历系统。它面向希望把简历当作长期资产维护的人：简历不应该被锁在某个网站表单里，而应该像代码一样可读、可改、可追踪、可复用。

核心理念很简单：

- **Markdown 是唯一事实源。**
- **AI Coding Agent 和你一起打磨内容。**
- **XeLaTeX 负责生成高质量 PDF。**
- **样式由可读参数控制，而不是拖拽文本框。**
- **所有文件都保存在本地，可版本管理，可自由 fork。**

![Oh My Resume example](assets/example.png)

Windows 下的工作流演示：
![Workflow Demo in Windows](assets/workflow-demo-win.gif)

## Philosophy

大多数简历工具优化的是“第一次导出”。Oh My Resume 优化的是“第十次迭代”。

真正重要的简历不是一张漂亮海报，而是一份高度压缩的职业叙事：判断力、取舍、项目、证据、结果。难点通常不是选择模板，而是判断什么值得写、如何写得可信、如何随着经历变化持续维护。

所以 Oh My Resume 把简历当作工程产物来处理：

- **内容是纯文本。** 可以 diff、review、重写、提交到 Git。
- **排版是确定的。** 同一份 Markdown 会稳定生成同一份 PDF。
- **AI 是协作者，不是表单助手。** Codex 或 Claude Code 可以阅读你的经历、项目仓库和上下文，帮你重写 bullet、压缩信息、调整版式、重新生成 PDF。
- **样式是显式参数。** 字体、边距、标签颜色、标题间距、照片尺寸、行高都写在 `omr.config.json` 里。
- **没有平台锁定。** 输入是 Markdown，输出是普通 PDF，渲染器在仓库内随 Skill 一起分发。

## Why Not A Resume Website?

这个领域已有很多成熟产品，它们解决的问题不同。Oh My Resume 不试图复刻一个在线简历网站，而是选择另一条路线：本地、自由、可编程、可被 Agent 深度协作。

| 工具 | 擅长 | 取舍 |
| --- | --- | --- |
| [超级简历 / WonderCV](https://www.wondercv.com/) | 在线简历制作、模板丰富、AI 辅助、上手快 | 更适合平台内工作流；深度自定义、源码归属、版本管理受产品边界影响 |
| [老鱼简历](https://www.laoyujianli.com/) | 快速生成在线简历、模板和 AI 编辑能力 | 适合快速产出；不太适合本地 Git 管理、Agent 读取上下文后的长期迭代 |
| [OneResume](https://github.com/virantha/one_resume) | 开源、YAML 数据驱动、多版本生成 | 结构化能力强；对 Markdown 写作体验、中文 TeX 排版、Agent 调参工作流关注较少 |
| LaTeX 简历模板 | 排版精确、源码可控 | 能力强但门槛高；频繁改内容时直接写 TeX 成本偏高 |
| **Oh My Resume** | **Free、Markdown、自定义、本地 PDF、AI Agent 协作、样式参数化、可 fork** | 需要本地具备 Node.js 和 XeLaTeX |

它的优势不是“模板最多”，而是：

- **Free**：本地运行，不依赖订阅才能完成核心导出。
- **Own your source**：简历源文件在你手里，不被平台锁定。
- **Agent-native**：天然适合 Codex / Claude Code 读取上下文后持续优化。
- **Markdown-first**：内容写作体验接近笔记，而不是填表。
- **TeX-quality PDF**：最终输出是适合投递的高质量 PDF。
- **Fully customizable**：从字号、行高、标题间距到标签颜色，都可以用精确数值控制。
- **Versionable**：每次投递、每个岗位版本都可以被 Git 记录。

目标不是在所有功能上击败所有简历网站，而是提供一条更适合工程师、创作者和高频迭代者的简历工作流：文本文件、仓库、自动化、审阅、持续迭代。

## What You Get

- 可读的 Markdown 简历格式。
- 随 Skill 分发的 CLI，无需额外安装 npm 包。
- 同目录 PDF 输出：`resume.md` -> `resume.pdf`。
- 生成的 LaTeX 和日志统一放在 `build/`。
- 本地 debug 页面：左侧 Markdown 编辑，右侧 PDF 预览。
- 中文简历友好的默认样式：CJK 字体、标签、右对齐日期、头像布局、紧凑一页排版。
- 精细化样式输入：支持 `11.2pt`、`14.5pt`、`8mm`、`2.75cm`、`0.41em` 这类精确值。

## Install

将本仓库安装为 Codex 或 Claude Code Skill。如果你的工具需要重启 Agent，安装后重启一次。

The repository root is the Skill folder:

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

## Use With An Agent

你可以直接让 Agent 操作：

```text
Use $oh-my-resume to create my resume PDF from resume.md.
```

Skill 会完成：

- 检查 Node.js、XeLaTeX、latexmk；
- 必要时初始化示例简历；
- 将 Markdown 渲染成 PDF；
- 将生成的 TeX 和日志放入 `build/`；
- 汇报明确的输入和输出路径。

也可以直接使用 CLI：

```bash
node assets/oh-my-resume/scripts/cli.js doctor
node assets/oh-my-resume/scripts/cli.js pdf resume.md
```

## Debug Preview

反复编辑时，可以启动本地 debug 页面：

```text
Use $oh-my-resume to debug resume.md.
```

页面包含：

- 左侧 Markdown 编辑器；
- 右侧 PDF 预览；
- `渲染 PDF` 按钮，保存 Markdown 并重新生成 PDF；
- `样式设置` 按钮，调整字体、间距、颜色、边距、照片尺寸；
- 自由输入数值，因此 `10.85pt`、`0.41em` 这类小数值也可以使用。

Direct command:

```bash
node assets/oh-my-resume/scripts/cli.js debug resume.md
```

debug 服务会一直运行，直到你手动停止进程。

## Markdown Rules

使用普通 Markdown，加上一些简历友好的约定：

```yaml
---
name: 文艺倾年
theme: classic
avatar: avatar.jpg
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

支持的标记：

- `#` 一级标题
- `##` 模块标题
- `###` 经历条目
- `` `tag` `` 标签
- `<time>...</time>` 右对齐时间
- `**text**` 加粗
- `[text](url)` 链接
- 条目下的任意 `字段：内容` 会作为普通字段行渲染

## Configuration

常用样式写在 `omr.config.json`：

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

如果需要完全自定义主题，可以在初始化后复制并编辑 `themes/classic.tex`。

## Requirements

Skill 会自动检查：

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
