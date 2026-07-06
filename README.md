<div align="center">
  <img src="assets/logo_new.svg" width="100px" alt="Oh My Resume" />
  <h1>🚀Oh My Resume</h1>
  <p>📄基于 Markdown 的 AI 驱动简历工程化系统</p>
  <p align="center">
  <a href="./README-EN.md"><img src="https://img.shields.io/badge/English-blue" alt="English"></a>
  <a href="./README.md"><img src="https://img.shields.io/badge/中文-red" alt="中文"></a>
</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  </p>
</div>


>  💡Oh My Resume 是一个 Skill-first 的 Markdown 简历系统。它面向希望把简历当作长期资产维护的人：简历不应该被锁在某个网站表单里，而应该像代码一样可读、可改、可追踪、可复用。

##  核心理念

- 📝 **Markdown 是唯一事实源。**
- 🤖 **AI Coding Agent 和你一起打磨内容。**
- 📦 **XeLaTeX 负责生成高质量 PDF。**
- 🎛 **样式由可读参数控制，而不是拖拽文本框。**
- 💾 **所有文件都保存在本地，可版本管理，可自由 fork。**

![Oh My Resume example](assets/example.png)

<p align="center">
  <em> Windows 下的工作流演示（待换）</em><br/>
  <img src="assets/workflow-demo-win.gif" alt="Workflow Demo" />
</p>

---

## 🎯 设计哲学

> 大多数简历工具优化的是"第一次导出"。**Oh My Resume 优化的是"第十次迭代"。**

真正重要的简历不是一张漂亮海报，而是一份高度压缩的职业叙事：

- 🧭 判断力  
- ✂️ 取舍  
- 🧩 项目  
- 📊 证据  
- 🎯 结果  

所以 Oh My Resume 把简历当作工程产物来处理：

-  📄**内容是纯文本。** 可以 diff、review、重写、提交到 Git。
-  📌**排版是确定的。** 同一份 Markdown 会稳定生成同一份 PDF。
-  🤖**AI 是协作者，不是表单助手。** Codex 或 Claude Code 可以阅读你的经历、项目仓库和上下文，帮你重写 bullet、压缩信息、调整版式、重新生成 PDF。
-  🎛**样式是显式参数。** 字体、边距、标签颜色、标题间距、照片尺寸、行高都写在 `omr.config.json` 里。
-  🔒**没有平台锁定。** 输入是 Markdown，输出是普通 PDF，渲染器在仓库内随 Skill 一起分发。

---

## 🆚为什么不用在线简历网站？

这个领域已有很多成熟产品，它们解决的问题不同。Oh My Resume 不试图复刻一个在线简历网站，而是选择另一条路线：**本地、自由、可编程、可被 Agent 深度协作。**

| 工具 | 数据模型 | 工作流 | AI能力 | 控制权 | 迭代能力 |
|------|----------|--------|--------|--------|----------|
| [超级简历 / WonderCV](https://www.wondercv.com/) | 平台封装 JSON + 模板 | 在线编辑 + 表单填充 | 有 AI 辅助生成内容 | ❌ 强绑定平台 | ❌ 单次导出导向 |
| [老鱼简历](https://www.laoyujianli.com/) | 表单 / 在线结构 | 模板驱动快速生成 | 基础 AI 改写 | ❌ 平台锁定 | ❌ 弱版本管理 |
| [OneResume](https://github.com/virantha/one_resume) | YAML 数据结构 | CLI / 模板渲染 | ❌ 无原生 AI | ✔ 开源可控 | ⚠ 支持多版本但非 Git-first |
| LaTeX 简历模板 | TeX 源码 | 手写 / 编译 | ❌ 无 AI | ✔ 完全可控 | ⚠ 但迭代成本高 |
| **Oh My Resume** | **Markdown + Config ** | **CLI + Agent + Debug UI** | **✔ Agent-native（Codex / Claude 可直接参与编辑）** | **✔ 完全本地 / 可 fork** | **✔ Git-first + 长期演化设计** |


我们的优势不是"模板最多"，而是：

-  🆓 **Free**：本地运行，不依赖订阅才能完成核心导出。
- 🧠 **Own your source**：简历源文件在你手里，不被平台锁定。
- 🤖 **Agent-native**：天然适合 Codex / Claude Code 读取上下文后持续优化。
- ✍️ **Markdown-first**：内容写作体验接近笔记，而不是填表。
- 📦 **TeX-quality PDF**：最终输出是适合投递的高质量 PDF。
- 🎨 **Fully customizable**：从字号、行高、标题间距到标签颜色，都可以用精确数值控制。
- 🔁 **Versionable**：每次投递、每个岗位版本都可以被 Git 记录。

目标不是在所有功能上击败所有简历网站，而是提供一条更适合工程师、创作者和高频迭代者的简历工作流：文本文件、仓库、自动化、审阅、持续迭代。

---

## ⚡ 快速开始

### 📦 安装

将本仓库安装为 Codex 或 Claude Code Skill。如果你的工具需要重启 Agent，安装后重启一次。

The repository root is the Skill folder:

```text
oh-my-resume/
  SKILL.md
  agents/openai.yaml
  assets/oh-my-resume/
```

### 🪟 Windows 首次使用

Windows 用户第一次生成 PDF 前，建议先准备本地 TeX 环境：

```bat
cd assets\oh-my-resume
install.bat
```

`install.bat` 会调用 `scripts\install.ps1`，刷新当前进程可见的 TeX 路径，保存 `OMR_TEX_PATH` 供后续终端使用，并执行 `node scripts\cli.js doctor`。

PowerShell / CI 可以直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -PersistUserEnv -VerifyPdf
```

### 🤖 使用 Agent

你可以直接让 Agent 操作：

```text
Use $oh-my-resume to create my resume PDF from resume.md.
```

Skill 会完成：

-  检查 Node.js、XeLaTeX、latexmk；
-  必要时初始化示例简历；
-  将 Markdown 渲染成 PDF；
-  将生成的 TeX 和日志放入 `build/`；
-  汇报明确的输入和输出路径。

### 💻 使用 CLI

```bash
node assets/oh-my-resume/scripts/cli.js doctor
node assets/oh-my-resume/scripts/cli.js pdf resume.md
```

### 🔧 Debug 预览

反复编辑时，可以启动本地 debug 页面：

```text
Use $oh-my-resume to debug resume.md.
```

页面包含：

-  左侧 Markdown 编辑器；
-  右侧 PDF 预览；
-  `渲染 PDF` 按钮，保存 Markdown 并重新生成 PDF；
-  `样式设置` 按钮，调整字体、间距、颜色、边距、照片尺寸；
-  自由输入数值，因此 `10.85pt`、`0.41em` 这类小数值也可以使用。

```bash
node assets/oh-my-resume/scripts/cli.js debug resume.md
```

debug 服务会一直运行，直到你手动停止进程。

---

## ✨ 功能特性
- 📄 Markdown 简历格式
- ⚙️ CLI 工具链
- 📦 PDF 一键生成
- 🧱 LaTeX 构建链
- 🧪 Debug 可视化编辑器
- 🇨🇳 中文优化排版
- 🎯 精细样式控制（pt / mm / em）

---

##  配置

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

---

##  环境要求

Skill 会自动检查：

-  Node.js 18+
-  XeLaTeX
-  latexmk

###   macOS

```bash
brew install --cask mactex-no-gui
```

###   Windows

- 安装 MiKTeX Basic: https://miktex.org/download
- 安装 Strawberry Perl: https://strawberryperl.com/
- 运行 `assets\oh-my-resume\install.bat`

###   Ubuntu/Debian

```bash
sudo apt-get install latexmk texlive-xetex texlive-lang-chinese
```

---

##  开源协议

本项目采用 [MIT License](LICENSE) 开源许可证。

---

<p align="center">
  <sub>Made with  by the open-source community</sub>
</p>
