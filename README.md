<p align="center">
  <img src="assets/oh-my-resume-logo.png" width="150px" alt="Oh My Resume" />
</p>


<h1 align="center">Oh My Resume</h1>

>  一个 Skill-first 的 Markdown 简历引擎——让职业经历像代码一样可读、可改、可追踪。

<p align="center">
  <a href="./README-EN.md"><img src="https://img.shields.io/badge/English-blue" alt="English"></a>&nbsp;
  <a href="./README.md"><img src="https://img.shields.io/badge/中文-red" alt="中文"></a>&nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>&nbsp;
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform">
</p>

![Oh My Resume example](assets/example.png)

请将下方提示词复制给你的 Agent，实现一键安装与配置：

> Clone and set up https://github.com/open-agent-power/oh-my-resume, then help me create my resume PDF.

---
一份真正有价值的简历，不是一张一次生成的 PDF。它是一份持续演进的职业记录，承载着个人经历、判断、选择与成长。

长期维护一份简历，需要三个核心能力：

- **上下文（Context）** —— 理解经历背后的价值。
  一个项目不只是技术栈的罗列，而是围绕问题、决策、挑战与成果展开的完整叙事。

- **迭代（Iteration）** —— 在持续优化中不断完善。
  优秀的简历并非一次完成，而是在反馈、修改与重构中逐渐形成。

- **掌控（Ownership）** —— 保持对职业数据的自主权。
  经历不应被限制在某个平台或模板中，而应始终保持可读、可改、可追踪、可复用。

Oh My Resume 围绕这三个核心理念构建：

**Context（理解经历） · Iteration（持续演进） · Ownership（自主掌控）**

在此基础上，**Agent 作为智能协作者**，参与简历构建的全过程，从内容组织、表达优化到格式生成，帮助将个人经历转化为高质量的职业叙事。


<p align="center">
  <em> Windows 下的工作流演示</em><br/>
  <img src="assets/workflow-demo-win.gif" alt="Workflow Demo" />
</p>

---

## 为什么选择 Oh My Resume？

这个领域已有很多成熟产品，它们解决的问题不同。Oh My Resume 不试图复刻一个在线简历网站，而是选择另一条路线：**本地、自由、可编程、可被 Agent 深度协作。**

| 能力 | 超级简历 | 老鱼简历 | OneResume | LaTeX 模板 | **Oh My Resume** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Markdown 原生支持 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 本地文件管理 | ❌ | ❌ | ✅ | ✅ | ✅ |
| Git 版本管理 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 长期维护迭代 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 配置驱动样式 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 自定义排版控制 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 自动生成 PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| 无平台锁定 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 上下文理解优化 | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agent 协作 | ❌ | ❌ | ❌ | ❌ | ✅ |

##  快速开始

将本仓库安装为 Codex 或 Claude Code Skill：

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

如果你的工具需要重启 Agent，安装后重启一次。

###  Agent工作流

Oh My Resume 不是一个在线编辑器，它让 Agent 直接参与简历构建流程：

```
Use $oh-my-resume to create my resume PDF from resume.md.
```

Agent 会自动完成：

- 检查 Node.js、XeLaTeX、latexmk 环境；
- 读取 Markdown 简历内容；
- 根据配置生成对应样式；
- 渲染 PDF；
- 输出生成路径和构建信息。

调试模式：

```
Use $oh-my-resume to debug resume.md.
```

可以启动本地预览环境，快速调整内容和样式。

### Windows 首次使用

Windows 用户第一次生成 PDF 前，建议先准备本地 TeX 环境：

```bat
cd assets\oh-my-resume
install.bat
```

`install.bat` 会调用 `scripts\install.ps1`，刷新当前进程可见的 TeX 路径，保存 `OMR_TEX_PATH` 供后续终端使用，并执行 `node scripts\cli.js doctor`。脚本会优先复用已安装的 MiKTeX 或 TeX Live。

PowerShell / CI 可以直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -PersistUserEnv -VerifyPdf
```
---
## Markdown 格式

Oh My Resume 使用 Markdown 作为唯一事实源。

示例：

```md
### 项目名称`标签` <right>2025年01月 - 2025年08月</right>

- <logo>alibaba</logo> 一级要点
  - 二级补充
    - 三级细节
```

支持：

- `##` 表示简历模块。
- `###` 表示经历条目。
- `` `标签` `` 会渲染为 Tag。
- `<right>...</right>` 会渲染为右侧时间。
- `-`、`  -`、`    -` 会分别渲染为一级、二级、三级列表。
- `**重点**` 会加粗。
- `[文本](链接)` 会保留为可点击链接。
- `<logo>alibaba</logo>` 会渲染为与文字基线对齐的企业 Logo。

内置 key：`alibaba`、`alibaba-cloud`、`bytedance`、`baidu`、`huawei`、
`meituan`、`xiaomi`、`kuaishou`、`alipay`、`taobao`、`apple`、`google`。
另支持中国移动：`china-mobile`。

AI 与互联网品牌还包括：`tongyi-lab`、`pinduoduo`、`xiaohongshu`、
`tencent`、`kimi`、`deepseek`。

自定义图片可直接写入 Markdown（PNG/JPG）：

```md
<logo src="logos/my-company.png">My Company</logo>
```

需要多次使用时，可以在 `omr.config.json` 注册短名称：

```json
{
  "logos": {
    "my-company": "logos/my-company.png"
  }
}
```

之后使用 `<logo>my-company</logo>`。图片路径相对于简历 Markdown 文件。

---
##  配置系统

所有视觉参数均通过`omr.config.json`控制。

包括：字体、页边距、行间距、主题颜色、图片尺寸等

示例：

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
      "omrInlineLogoHeight": "1em",
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
  },
  "logos": {
    "my-company": "logos/my-company.png"
  }
}
```

如果需要完全自定义主题，可以在初始化后复制并编辑 `themes/classic.tex`。

### 配置优先级

Oh My Resume 会优先读取当前工作目录的本地配置：

1. 命令行指定 `--config path/to/config.json`

2. 当前目录 `omr.config.json`

3. Skill 默认配置

> 因此 Skill 更新不会覆盖你的当前简历样式。只要 `omr.config.json` 留在简历目录下，它就会优先覆盖内置推荐值。

### 本地样式模板

可以把常用样式保存到当前目录的 `omr.styles/`：

```text
omr.styles/
  current-comfort.json
  compact.json
  interview.json
```

Debug 页面的「样式设置 -> 模板」只读取当前目录的本地模板。如果没有 `omr.styles/*.json`，下拉框会显示为空状态。你也可以在「配置路径」里填写任意相对路径，例如：

```text
omr.styles/current-comfort.json
```

也可以点击「打开文件夹」选择包含 JSON 配置的文件夹，页面会读取其中的配置并应用。应用模板会合并 `theme`、`markdown` 和 `logos` 配置，不会修改 Markdown 正文、输入路径或输出路径。

---

##  环境要求

Skill 会自动检查：

-  Node.js 18+
-  XeLaTeX
-  latexmk

HTML 快速预览不依赖 TeX。`html-pdf` / 「HTML 导出 PDF」需要本机安装 Google Chrome、Microsoft Edge 或 Chromium；自动检测失败时可设置：

```bash
export OMR_HTML_PDF_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

###   macOS

```bash
brew install --cask mactex-no-gui
```

###   Windows

- 安装 [MiKTeX Basic](https://miktex.org/download)，或安装 [TeX Live](https://tug.org/texlive/)
- 安装 [Strawberry Perl](https://strawberryperl.com/)
- 运行 `assets\oh-my-resume\install.bat`

###   Ubuntu/Debian

```bash
sudo apt-get install latexmk texlive-xetex texlive-lang-chinese
```

---
## Star History

<a href="https://www.star-history.com/?repos=itxaiohanglover%2Foh-my-resume&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=itxaiohanglover/oh-my-resume&type=date&theme=dark&legend=top-left&sealed_token=t0ppc2tOyb-1FU2smIV6wtC2SpG5rFBz9YVkrHND4iPoZ4E8_fokq0v5RTJHot2JRRfwUk65kRMX8YE5p_KwvcVH60zmLKb-joUIFhvGUgHbWm62Duw9ouMnQ9B_o47m1A8-DBvhHQ1KwIoTy8ZGmxxrYD7QauB0PhqwPzI-Qu_kCAqYX5UWy9KsEw1p" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=itxaiohanglover/oh-my-resume&type=date&legend=top-left&sealed_token=t0ppc2tOyb-1FU2smIV6wtC2SpG5rFBz9YVkrHND4iPoZ4E8_fokq0v5RTJHot2JRRfwUk65kRMX8YE5p_KwvcVH60zmLKb-joUIFhvGUgHbWm62Duw9ouMnQ9B_o47m1A8-DBvhHQ1KwIoTy8ZGmxxrYD7QauB0PhqwPzI-Qu_kCAqYX5UWy9KsEw1p" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=itxaiohanglover/oh-my-resume&type=date&legend=top-left&sealed_token=t0ppc2tOyb-1FU2smIV6wtC2SpG5rFBz9YVkrHND4iPoZ4E8_fokq0v5RTJHot2JRRfwUk65kRMX8YE5p_KwvcVH60zmLKb-joUIFhvGUgHbWm62Duw9ouMnQ9B_o47m1A8-DBvhHQ1KwIoTy8ZGmxxrYD7QauB0PhqwPzI-Qu_kCAqYX5UWy9KsEw1p" />
 </picture>
</a>

---
##  开源协议

本项目采用 [MIT License](LICENSE) 开源许可证。

---

<p align="center">
  <sub>Made with  by the open-source community</sub>
</p>
