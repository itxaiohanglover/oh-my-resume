#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { URL } = require("url");
const { buildResume } = require("./build");

const packageRoot = path.resolve(__dirname, "..");

function usage() {
  console.log(`oh-my-resume

Usage:
  oh-my-resume init [dir]
  oh-my-resume build [input.md] [--out build/resume.tex] [--config omr.config.json] [--theme classic]
  oh-my-resume pdf [input.md] [--out build/resume.tex] [--pdf resume.pdf] [--config omr.config.json]
  oh-my-resume debug [input.md] [--pdf resume.pdf] [--config omr.config.json] [--port 0] [--no-open]
  oh-my-resume watch [input.md] [--pdf resume.pdf] [--config omr.config.json]  # advanced
  oh-my-resume doctor

Examples:
  oh-my-resume init .
  oh-my-resume pdf resume.md
  oh-my-resume debug resume.md
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function initProject(targetDir) {
  const target = path.resolve(process.cwd(), targetDir || ".");
  fs.mkdirSync(target, { recursive: true });

  const resumeTarget = path.join(target, "resume.md");
  const configTarget = path.join(target, "omr.config.json");
  const themesDir = path.join(target, "themes");

  if (!fs.existsSync(resumeTarget)) {
    copyFile(path.join(packageRoot, "examples", "resume.md"), resumeTarget);
  }
  if (!fs.existsSync(configTarget)) {
    fs.writeFileSync(
      configTarget,
      `${JSON.stringify(
        {
          input: "resume.md",
          output: "build/resume.tex",
          pdf: "resume.pdf",
          resume: {
            theme: "classic"
          },
          theme: {
            colors: {
              omrAccent: "59,130,246",
              omrTagBg: "232,241,255",
              omrTagText: "37,99,235",
              omrSectionBg: "242,242,242",
              omrLinkColor: "37,99,235"
            },
            lengths: {
              omrPageMarginLeft: "8mm",
              omrPageMarginRight: "8mm",
              omrPageMarginTop: "8mm",
              omrPageMarginBottom: "8mm",
              omrPhotoWidth: "2.35cm",
              omrPhotoHeight: "2.75cm",
              omrHeaderGap: "7mm",
              omrHeaderNameGap: "0.41em",
              omrHeaderLineGap: "0.1em",
              omrTitleBodyGap: "0.38em",
              omrHeadingOneBefore: "0.42em",
              omrHeadingOneAfter: "0.22em",
              omrSectionBefore: "0.58em",
              omrSectionAfter: "0.54em",
              omrEntryBefore: "0.23em",
              omrEntryAfter: "0.22em",
              omrEntryDateWidth: "39mm",
              omrPhotoRightInset: "0mm"
            },
            fonts: {
              omrBodyFont: "TeX Gyre Termes",
              omrCJKMainFont: "Kaiti SC"
            },
            sizes: {
              omrBodyFontSize: "11.2pt",
              omrBodyLineHeight: "14.5pt",
              omrHOneFontSize: "16.9pt",
              omrHOneLineHeight: "19pt",
              omrSectionFontSize: "12.1pt",
              omrSectionLineHeight: "14.2pt",
              omrEntryFontSize: "10.5pt",
              omrEntryLineHeight: "13pt"
            }
          }
        },
        null,
        2
      )}\n`
    );
  }
  fs.mkdirSync(themesDir, { recursive: true });
  copyFile(path.join(packageRoot, "src", "themes", "classic.tex"), path.join(themesDir, "classic.tex"));

  console.log(`Initialized ${path.relative(process.cwd(), target) || "."}`);
  console.log("Edit resume.md, then run: oh-my-resume pdf resume.md");
}

function loadConfig(cwd, configPath) {
  const file = path.resolve(cwd, configPath || "omr.config.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function resolveMarkdownInput(cwd, config, explicitInput) {
  if (explicitInput) return explicitInput;
  if (config.input) return config.input;
  throw new Error("Missing Markdown input. Usage: oh-my-resume pdf <resume.md>");
}

function defaultTexOutput(input) {
  const name = path.basename(input, path.extname(input));
  return path.join("build", `${name}.tex`);
}

function defaultPdfOutput(input) {
  return `${path.basename(input, path.extname(input))}.pdf`;
}

function buildCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const output = args.out || config.output || defaultTexOutput(input);
  const result = buildResume({
    cwd,
    input,
    output,
    config: args.config || (fs.existsSync(path.resolve(cwd, "omr.config.json")) ? "omr.config.json" : undefined),
    theme: args.theme,
    packageRoot
  });
  if (!args.silent) {
    console.log(`Generated ${path.relative(cwd, result.output)} from ${path.relative(cwd, result.input)}`);
  }
  return result;
}

function pdfCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const buildArgs = { ...args, _: [input] };
  const result = buildCommand(buildArgs);
  const pdf = path.resolve(cwd, args.pdf || config.pdf || defaultPdfOutput(input));
  const outDir = path.dirname(result.output);
  fs.mkdirSync(path.dirname(pdf), { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const env = withTexPath(process.env, [path.dirname(result.output)]);
  const latexmkBin = findCommand("latexmk", env);
  if (!latexmkBin) {
    throw new Error("latexmk not found. Install MacTeX no-GUI or add /Library/TeX/texbin to PATH.");
  }

  const latexmk = spawnSync(latexmkBin, [
    "-xelatex",
    "-interaction=nonstopmode",
    "-halt-on-error",
    `-outdir=${outDir}`,
    result.output
  ], {
    cwd,
    env,
    encoding: "utf8"
  });

  if (latexmk.status !== 0) {
    if (!args.silent) {
      if (latexmk.stdout) process.stdout.write(latexmk.stdout);
      if (latexmk.stderr) process.stderr.write(latexmk.stderr);
    }
    const detail = [latexmk.stdout, latexmk.stderr].filter(Boolean).join("\n").trim();
    const error = new Error(detail || "PDF generation failed.");
    error.status = latexmk.status || 1;
    throw error;
  }

  const generated = path.join(outDir, `${path.basename(result.output, ".tex")}.pdf`);
  if (generated !== pdf && fs.existsSync(generated)) {
    fs.renameSync(generated, pdf);
  }
  if (!args.silent) {
    console.log(`Generated ${path.relative(cwd, pdf)}`);
  }
  return { input: result.input, tex: result.output, pdf };
}

function debugCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const configPath = path.resolve(cwd, args.config || "omr.config.json");
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const inputPath = path.resolve(cwd, input);
  const pdfPath = path.resolve(cwd, args.pdf || config.pdf || defaultPdfOutput(input));

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Markdown file not found: ${input}`);
  }

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, "http://127.0.0.1");

    if (req.method === "GET" && requestUrl.pathname === "/") {
      send(res, 200, debugHtml(path.basename(inputPath)));
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/state") {
      sendJson(res, 200, {
        input: path.relative(cwd, inputPath),
        pdf: path.relative(cwd, pdfPath),
        markdown: fs.readFileSync(inputPath, "utf8"),
        config: normalizeDebugConfig(loadConfig(cwd, args.config)),
        pdfUrl: fs.existsSync(pdfPath) ? `/pdf?ts=${Date.now()}` : null
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/config") {
      readJsonBody(req)
        .then((body) => {
          const current = loadConfig(cwd, args.config);
          const next = mergeDebugConfig(current, body.config || {});
          fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
          sendJson(res, 200, {
            ok: true,
            config: normalizeDebugConfig(next),
            path: path.relative(cwd, configPath)
          });
        })
        .catch((error) => {
          sendJson(res, 500, {
            ok: false,
            error: trimError(error.message || String(error))
          });
        });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/ping") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/render") {
      readJsonBody(req)
        .then((body) => {
          fs.writeFileSync(inputPath, String(body.markdown || ""), "utf8");
          const result = pdfCommand({ ...args, _: [input], silent: true });
          sendJson(res, 200, {
            ok: true,
            input: path.relative(cwd, result.input),
            tex: path.relative(cwd, result.tex),
            pdf: path.relative(cwd, result.pdf),
            pdfUrl: `/pdf?ts=${Date.now()}`
          });
        })
        .catch((error) => {
          sendJson(res, 500, {
            ok: false,
            error: trimError(error.message || String(error))
          });
        });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/pdf") {
      if (!fs.existsSync(pdfPath)) {
        send(res, 404, "PDF has not been generated yet.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(pdfPath).pipe(res);
      return;
    }

    send(res, 404, "Not found");
  });

  const requestedPort = Number(args.port || 0);
  server.listen(requestedPort, "127.0.0.1", () => {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}`;
    console.log(`Oh My Resume debug: ${url}`);
    console.log(`Editing ${path.relative(cwd, inputPath)} -> ${path.relative(cwd, pdfPath)}`);
    console.log("Press Ctrl+C in the terminal to stop this debug session.");
    if (!args["no-open"]) openBrowser(url);
  });
}

function normalizeDebugConfig(config = {}) {
  const theme = config.theme || {};
  return {
    theme: {
      colors: {
        omrTagBg: "232,241,255",
        omrTagText: "37,99,235",
        omrSectionBg: "242,242,242",
        omrSectionRule: "31,41,55",
        omrLinkColor: "37,99,235",
        ...(theme.colors || {})
      },
      lengths: {
        omrPageMarginLeft: "8mm",
        omrPageMarginRight: "8mm",
        omrPageMarginTop: "8mm",
        omrPageMarginBottom: "8mm",
        omrPhotoWidth: "2.35cm",
        omrPhotoHeight: "2.75cm",
        omrHeaderGap: "7mm",
        omrHeaderNameGap: "0.41em",
        omrHeaderLineGap: "0.1em",
        omrTitleBodyGap: "0.38em",
        omrHeadingOneBefore: "0.42em",
        omrHeadingOneAfter: "0.22em",
        omrSectionBefore: "0.58em",
        omrSectionAfter: "0.54em",
        omrEntryBefore: "0.23em",
        omrEntryAfter: "0.22em",
        omrEntryDateWidth: "39mm",
        omrPhotoRightInset: "0mm",
        ...(theme.lengths || {})
      },
      fonts: {
        omrBodyFont: "TeX Gyre Termes",
        omrCJKMainFont: "Kaiti SC",
        ...(theme.fonts || {})
      },
      sizes: {
        omrBodyFontSize: "11.2pt",
        omrBodyLineHeight: "14.5pt",
        omrHOneFontSize: "16.9pt",
        omrHOneLineHeight: "19pt",
        omrSectionFontSize: "12.1pt",
        omrSectionLineHeight: "14.2pt",
        omrEntryFontSize: "10.5pt",
        omrEntryLineHeight: "13pt",
        ...(theme.sizes || {})
      }
    },
    markdown: {
      dateFields: ["时间", "日期", "date", "dates"],
      tagFields: ["标签", "tags"],
      ...(config.markdown || {})
    }
  };
}

function mergeDebugConfig(current, incoming) {
  const normalized = normalizeDebugConfig(incoming);
  return {
    ...current,
    theme: {
      ...(current.theme || {}),
      colors: cleanObject(normalized.theme.colors, isRgb),
      lengths: cleanObject(normalized.theme.lengths, isLength),
      fonts: cleanObject(normalized.theme.fonts, isFontName),
      sizes: cleanObject(normalized.theme.sizes, isFontSize)
    },
    markdown: {
      ...(current.markdown || {}),
      dateFields: cleanStringList(normalized.markdown.dateFields),
      tagFields: cleanStringList(normalized.markdown.tagFields)
    }
  };
}

function cleanObject(value, predicate) {
  const result = {};
  for (const [key, item] of Object.entries(value || {})) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(key) && predicate(String(item))) {
      result[key] = String(item).trim();
    }
  }
  return result;
}

function cleanStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

function isRgb(value) {
  return /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value);
}

function isLength(value) {
  return /^[0-9.]+(mm|cm|pt|em|ex)$/.test(value);
}

function isFontName(value) {
  return value.length > 0 && value.length < 80 && !/[{}\\]/.test(value);
}

function isFontSize(value) {
  return /^[0-9.]+pt$/.test(value);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, contentType = "text/html; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function trimError(message) {
  const lines = String(message).split(/\r?\n/).filter(Boolean);
  return lines.slice(Math.max(0, lines.length - 80)).join("\n");
}

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {
    console.log(`Open this URL in your browser: ${url}`);
  });
  child.unref();
}

function debugHtml(fileName) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Oh My Resume Debug</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f6f8;
      --panel: #ffffff;
      --line: #d7dbe2;
      --text: #151922;
      --muted: #687180;
      --accent: #111827;
      --danger: #b42318;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
    }
    .app {
      display: grid;
      grid-template-rows: 48px 1fr 28px;
      height: 100vh;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 14px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .title {
      min-width: 0;
      font-size: 14px;
      font-weight: 650;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 0 0 auto;
    }
    button {
      height: 32px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: white;
      padding: 0 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(340px, 45%) minmax(420px, 55%);
      min-height: 0;
    }
    .editorPane, .previewPane {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .editorPane {
      border-right: 1px solid var(--line);
      background: var(--panel);
    }
    textarea {
      width: 100%;
      height: 100%;
      min-height: 0;
      border: 0;
      outline: 0;
      resize: none;
      padding: 18px 20px 48px;
      font: 14px/1.62 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      color: var(--text);
      background: var(--panel);
      tab-size: 2;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #c8ccd3;
    }
    .empty {
      display: grid;
      place-items: center;
      height: 100%;
      color: var(--muted);
      font-size: 14px;
      text-align: center;
      padding: 24px;
    }
    .status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 14px;
      border-top: 1px solid var(--line);
      background: var(--panel);
      color: var(--muted);
      font-size: 12px;
    }
    .error {
      color: var(--danger);
      font-weight: 600;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    dialog {
      width: min(840px, calc(100vw - 40px));
      max-height: min(640px, calc(100vh - 40px));
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
    }
    dialog::backdrop { background: rgba(15, 23, 42, 0.32); }
    .dialogHead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      font-weight: 650;
    }
    .dialogBody {
      margin: 0;
      padding: 14px;
      white-space: pre-wrap;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      overflow: auto;
      max-height: 540px;
      color: var(--danger);
      background: #fffafa;
    }
    .styleBody {
      padding: 14px;
      overflow: auto;
      max-height: 540px;
    }
    .quickMenu {
      display: grid;
      grid-template-columns: repeat(2, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }
    .settingsSection {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fff;
    }
    .settingsTitle {
      margin: 0 0 9px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .settingsRow {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .menuItem {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      padding: 0 9px;
      color: var(--text);
      font-size: 13px;
      white-space: nowrap;
    }
    .menuItem select,
    .menuItem input {
      height: 28px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--text);
      font: inherit;
    }
    .menuItem select {
      cursor: pointer;
    }
    .menuItem input {
      width: 72px;
    }
    .menuIcon {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .swatches {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .swatch {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      cursor: pointer;
    }
    .swatch.active {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .styleHint {
      color: var(--muted);
      font-size: 12px;
      margin: 8px 0 12px;
    }
    details.advanced {
      border-top: 1px solid var(--line);
      margin-top: 12px;
      padding-top: 12px;
    }
    details.advanced summary {
      cursor: pointer;
      color: var(--text);
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .styleGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 12px 14px;
    }
    .field {
      display: grid;
      gap: 5px;
      min-width: 0;
    }
    .field label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }
    .field input {
      height: 32px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 0 9px;
      font: 13px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--text);
      background: #fff;
    }
    .dialogActions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 14px;
      border-top: 1px solid var(--line);
    }
    .ghost {
      border-color: var(--line);
      background: white;
      color: var(--text);
    }
    @media (max-width: 900px) {
      .workspace { grid-template-columns: 1fr; grid-template-rows: 48% 52%; }
      .editorPane { border-right: 0; border-bottom: 1px solid var(--line); }
      .quickMenu { grid-template-columns: 1fr; }
      .styleGrid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="toolbar">
      <div class="title">Oh My Resume · ${escapeHtml(fileName)}</div>
      <div class="actions">
        <button class="ghost" id="style">样式设置</button>
        <button id="render">渲染 PDF</button>
      </div>
    </header>
    <main class="workspace">
      <section class="editorPane">
        <textarea id="editor" spellcheck="false"></textarea>
      </section>
      <section class="previewPane" id="preview">
        <div class="empty">点击“渲染 PDF”生成右侧预览。</div>
      </section>
    </main>
    <footer class="status">
      <span id="paths"></span>
      <span id="message">就绪</span>
    </footer>
  </div>
  <dialog id="errorDialog">
    <div class="dialogHead">
      <span>渲染错误</span>
      <button class="ghost" id="closeError">关闭</button>
    </div>
    <pre class="dialogBody" id="errorText"></pre>
  </dialog>
  <dialog id="styleDialog">
    <div class="dialogHead">
      <span>样式设置</span>
      <button class="ghost" id="closeStyle">关闭</button>
    </div>
    <div class="styleBody">
      <div class="quickMenu">
        <section class="settingsSection">
          <p class="settingsTitle">版式</p>
          <div class="settingsRow">
            <button class="ghost" id="smartOnePage" type="button">智能压缩一页</button>
            <button class="ghost" id="compactText" type="button">压缩文字</button>
            <span class="menuItem"><span class="menuIcon">页边距</span><input id="quickMargin" placeholder="8mm"></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle">字体</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">中文字体</span><select id="quickFont"></select></span>
            <span class="menuItem"><span class="menuIcon">字号</span><input id="quickSize" placeholder="11.2pt"></span>
            <span class="menuItem"><span class="menuIcon">行高</span><input id="quickLine" placeholder="14.5pt"></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle">主题</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">颜色</span><span class="swatches" id="quickTheme"></span></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle">照片</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">高度</span><input id="quickPhoto" placeholder="2.75cm"></span>
          </div>
        </section>
      </div>
      <details class="advanced">
        <summary>高级参数</summary>
        <p class="styleHint">这些值会直接写入 omr.config.json，支持 mm、cm、pt、em 等 LaTeX 单位。</p>
        <div class="styleGrid" id="styleGrid"></div>
      </details>
    </div>
    <div class="dialogActions">
      <button class="ghost" id="resetStyle">重新加载</button>
      <button id="saveStyle">保存样式</button>
    </div>
  </dialog>
  <script>
    const editor = document.getElementById("editor");
    const renderButton = document.getElementById("render");
    const styleButton = document.getElementById("style");
    const preview = document.getElementById("preview");
    const message = document.getElementById("message");
    const paths = document.getElementById("paths");
    const errorDialog = document.getElementById("errorDialog");
    const errorText = document.getElementById("errorText");
    const closeError = document.getElementById("closeError");
    const styleDialog = document.getElementById("styleDialog");
    const closeStyle = document.getElementById("closeStyle");
    const saveStyle = document.getElementById("saveStyle");
    const resetStyle = document.getElementById("resetStyle");
    const styleGrid = document.getElementById("styleGrid");
    const smartOnePage = document.getElementById("smartOnePage");
    const compactText = document.getElementById("compactText");
    const quickFont = document.getElementById("quickFont");
    const quickSize = document.getElementById("quickSize");
    const quickLine = document.getElementById("quickLine");
    const quickMargin = document.getElementById("quickMargin");
    const quickPhoto = document.getElementById("quickPhoto");
    const quickTheme = document.getElementById("quickTheme");
    let currentConfig = null;

    const fontOptions = [
      ["Songti SC", "宋体"],
      ["Kaiti SC", "楷体"],
      ["PingFang SC", "苹方"],
      ["Noto Serif CJK SC", "Noto Serif"]
    ];
    const themeOptions = [
      { name: "blue", color: "37,99,235", tagBg: "232,241,255", sectionBg: "242,242,242" },
      { name: "black", color: "17,24,39", tagBg: "243,244,246", sectionBg: "242,242,242" },
      { name: "green", color: "15,118,110", tagBg: "225,245,238", sectionBg: "241,245,244" },
      { name: "slate", color: "51,65,85", tagBg: "241,245,249", sectionBg: "243,244,246" }
    ];

    const styleFields = [
      ["theme.colors.omrTagBg", "标签背景色"],
      ["theme.colors.omrTagText", "标签文字色"],
      ["theme.colors.omrSectionBg", "二级标题背景色"],
      ["theme.colors.omrSectionRule", "二级标题左侧竖线色"],
      ["theme.colors.omrLinkColor", "链接颜色"],
      ["theme.lengths.omrPageMarginLeft", "左页边距"],
      ["theme.lengths.omrPageMarginRight", "右页边距"],
      ["theme.lengths.omrPageMarginTop", "上页边距"],
      ["theme.lengths.omrPageMarginBottom", "下页边距"],
      ["theme.lengths.omrPhotoWidth", "照片宽度"],
      ["theme.lengths.omrPhotoHeight", "照片高度"],
      ["theme.lengths.omrHeaderGap", "头部文字与照片间距"],
      ["theme.lengths.omrHeaderNameGap", "姓名到联系方式间距"],
      ["theme.lengths.omrHeaderLineGap", "联系方式行距"],
      ["theme.lengths.omrTitleBodyGap", "标题到正文间距"],
      ["theme.lengths.omrHeadingOneBefore", "一级标题上间距"],
      ["theme.lengths.omrHeadingOneAfter", "一级标题下间距"],
      ["theme.lengths.omrSectionBefore", "二级标题上间距"],
      ["theme.lengths.omrSectionAfter", "二级标题下间距"],
      ["theme.lengths.omrEntryBefore", "三级标题上间距"],
      ["theme.lengths.omrEntryAfter", "三级标题下间距"],
      ["theme.lengths.omrEntryDateWidth", "三级标题日期宽度"],
      ["theme.lengths.omrPhotoRightInset", "照片右侧缩进"],
      ["theme.fonts.omrBodyFont", "英文字体"],
      ["theme.fonts.omrCJKMainFont", "中文字体"],
      ["theme.sizes.omrBodyFontSize", "正文/列表字号"],
      ["theme.sizes.omrHOneFontSize", "一级标题字号"],
      ["theme.sizes.omrSectionFontSize", "二级标题字号"],
      ["theme.sizes.omrEntryFontSize", "三级标题字号"],
      ["markdown.dateFields", "日期字段名"],
      ["markdown.tagFields", "标签字段名"]
    ];

    async function loadState() {
      const response = await fetch("/api/state");
      const state = await response.json();
      editor.value = state.markdown;
      currentConfig = state.config;
      renderStyleFields();
      renderQuickControls();
      paths.textContent = state.input + " -> " + state.pdf;
      if (state.pdfUrl) showPdf(state.pdfUrl);
    }

    function showPdf(url) {
      preview.innerHTML = "";
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = "PDF 预览";
      preview.appendChild(frame);
    }

    async function render() {
      renderButton.disabled = true;
      message.className = "";
      message.textContent = "正在渲染...";
      try {
        const response = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: editor.value })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "渲染失败。");
        showPdf(data.pdfUrl);
        message.textContent = "已渲染 " + new Date().toLocaleTimeString();
      } catch (error) {
        message.className = "error";
        message.textContent = "渲染失败";
        errorText.textContent = error.message || String(error);
        errorDialog.showModal();
      } finally {
        renderButton.disabled = false;
      }
    }

    function renderStyleFields() {
      styleGrid.innerHTML = "";
      for (const [path, label] of styleFields) {
        const wrapper = document.createElement("div");
        wrapper.className = "field";
        const labelNode = document.createElement("label");
        labelNode.textContent = label;
        const input = document.createElement("input");
        input.dataset.path = path;
        input.value = getPath(currentConfig, path);
        wrapper.append(labelNode, input);
        styleGrid.appendChild(wrapper);
      }
    }

    function renderQuickControls() {
      fillSelect(quickFont, fontOptions.map(([value, label]) => [value, label]), getPath(currentConfig, "theme.fonts.omrCJKMainFont"));
      quickSize.value = getPath(currentConfig, "theme.sizes.omrBodyFontSize");
      quickLine.value = getPath(currentConfig, "theme.sizes.omrBodyLineHeight");
      quickMargin.value = getPath(currentConfig, "theme.lengths.omrPageMarginLeft");
      quickPhoto.value = getPath(currentConfig, "theme.lengths.omrPhotoHeight");
      quickTheme.innerHTML = "";
      const activeColor = getPath(currentConfig, "theme.colors.omrTagText");
      for (const theme of themeOptions) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "swatch" + (theme.color === activeColor ? " active" : "");
        item.title = theme.name;
        item.style.background = "rgb(" + theme.color + ")";
        item.addEventListener("click", () => {
          setPath(currentConfig, "theme.colors.omrTagText", theme.color);
          setPath(currentConfig, "theme.colors.omrLinkColor", theme.color);
          setPath(currentConfig, "theme.colors.omrSectionRule", theme.color);
          setPath(currentConfig, "theme.colors.omrTagBg", theme.tagBg);
          setPath(currentConfig, "theme.colors.omrSectionBg", theme.sectionBg);
          renderStyleFields();
          renderQuickControls();
        });
        quickTheme.appendChild(item);
      }
    }

    function fillSelect(select, options, active) {
      select.innerHTML = "";
      for (const [value, label] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        if (value === active) option.selected = true;
        select.appendChild(option);
      }
    }

    function getPath(source, path) {
      const parts = path.split(".");
      let value = source;
      for (const part of parts) value = value && value[part];
      return Array.isArray(value) ? value.join(", ") : (value || "");
    }

    function setPath(target, path, value) {
      const parts = path.split(".");
      let cursor = target;
      for (let i = 0; i < parts.length - 1; i += 1) {
        cursor[parts[i]] = cursor[parts[i]] || {};
        cursor = cursor[parts[i]];
      }
      const key = parts[parts.length - 1];
      cursor[key] = path.startsWith("markdown.") ? value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) : value.trim();
    }

    function collectStyleConfig() {
      const config = { theme: { colors: {}, lengths: {}, fonts: {}, sizes: {} }, markdown: {} };
      for (const input of styleGrid.querySelectorAll("input")) {
        setPath(config, input.dataset.path, input.value);
      }
      return config;
    }

    function applyQuickConfig() {
      setPath(currentConfig, "theme.fonts.omrCJKMainFont", quickFont.value);
      setPath(currentConfig, "theme.sizes.omrBodyFontSize", quickSize.value);
      setPath(currentConfig, "theme.sizes.omrEntryFontSize", quickSize.value);
      setPath(currentConfig, "theme.sizes.omrBodyLineHeight", quickLine.value);
      setPath(currentConfig, "theme.sizes.omrEntryLineHeight", quickLine.value);
      setPath(currentConfig, "theme.lengths.omrPageMarginLeft", quickMargin.value);
      setPath(currentConfig, "theme.lengths.omrPageMarginRight", quickMargin.value);
      setPath(currentConfig, "theme.lengths.omrPageMarginTop", quickMargin.value);
      setPath(currentConfig, "theme.lengths.omrPageMarginBottom", quickMargin.value);
      setPath(currentConfig, "theme.lengths.omrPhotoHeight", quickPhoto.value);
      renderStyleFields();
    }

    function applySmartOnePage() {
      setPath(currentConfig, "theme.lengths.omrPageMarginLeft", "6mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginRight", "6mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginTop", "6mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginBottom", "4mm");
      setPath(currentConfig, "theme.sizes.omrBodyFontSize", "9.6pt");
      setPath(currentConfig, "theme.sizes.omrBodyLineHeight", "12.2pt");
      setPath(currentConfig, "theme.sizes.omrEntryFontSize", "9.6pt");
      setPath(currentConfig, "theme.sizes.omrEntryLineHeight", "12.2pt");
      setPath(currentConfig, "theme.sizes.omrSectionFontSize", "11.2pt");
      setPath(currentConfig, "theme.lengths.omrPhotoHeight", "2.3cm");
      renderStyleFields();
      renderQuickControls();
    }

    function applyCompactText() {
      const body = getPath(currentConfig, "theme.sizes.omrBodyFontSize") || "10pt";
      const numeric = Math.max(9.2, parseFloat(body) - 0.4).toFixed(1).replace(/\\.0$/, "") + "pt";
      setPath(currentConfig, "theme.sizes.omrBodyFontSize", numeric);
      setPath(currentConfig, "theme.sizes.omrEntryFontSize", numeric);
      setPath(currentConfig, "theme.sizes.omrBodyLineHeight", (parseFloat(numeric) + 2.6).toFixed(1).replace(/\\.0$/, "") + "pt");
      setPath(currentConfig, "theme.sizes.omrEntryLineHeight", (parseFloat(numeric) + 2.6).toFixed(1).replace(/\\.0$/, "") + "pt");
      renderStyleFields();
      renderQuickControls();
    }

    async function saveStyleConfig() {
      saveStyle.disabled = true;
      message.className = "";
      message.textContent = "Saving style...";
      try {
        const response = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: collectStyleConfig() })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Style save failed.");
        currentConfig = data.config;
        renderStyleFields();
        styleDialog.close();
        message.textContent = "Saved " + data.path;
      } catch (error) {
        message.className = "error";
        message.textContent = "Style save failed";
        errorText.textContent = error.message || String(error);
        errorDialog.showModal();
      } finally {
        saveStyle.disabled = false;
      }
    }

    closeError.addEventListener("click", () => errorDialog.close());
    closeStyle.addEventListener("click", () => styleDialog.close());
    styleButton.addEventListener("click", () => styleDialog.showModal());
    smartOnePage.addEventListener("click", applySmartOnePage);
    compactText.addEventListener("click", applyCompactText);
    quickFont.addEventListener("change", applyQuickConfig);
    quickSize.addEventListener("input", applyQuickConfig);
    quickLine.addEventListener("input", applyQuickConfig);
    quickMargin.addEventListener("input", applyQuickConfig);
    quickPhoto.addEventListener("input", applyQuickConfig);
    saveStyle.addEventListener("click", saveStyleConfig);
    resetStyle.addEventListener("click", loadState);
    renderButton.addEventListener("click", render);
    setInterval(() => fetch("/api/ping", { method: "POST" }).catch(() => {}), 2000);
    window.addEventListener("beforeunload", () => {
      navigator.sendBeacon("/api/ping");
    });
    loadState().catch((error) => {
      message.className = "error";
      message.textContent = error.message || String(error);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watchCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  let timer = null;
  let running = false;
  let lastBuiltMtime = 0;

  function run(reason) {
    const inputPath = path.resolve(cwd, input);
    const mtime = fs.statSync(inputPath).mtimeMs;
    if (reason === "saved" && mtime <= lastBuiltMtime) return;
    if (running) return;
    running = true;
    try {
      lastBuiltMtime = mtime;
      pdfCommand({ ...args, _: [input] });
      const stamp = new Date().toLocaleTimeString();
      console.log(`[${stamp}] Updated ${args.pdf || config.pdf || defaultPdfOutput(input)}${reason ? ` (${reason})` : ""}`);
    } catch (error) {
      console.error(error.message || error);
    } finally {
      running = false;
    }
  }

  run("initial");
  console.log(`Watching ${input}. Press Ctrl+C to stop.`);
  fs.watch(path.resolve(cwd, input), { persistent: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => run("saved"), 250);
  });
}

function withTexPath(env, texInputs = []) {
  const additions = ["/Library/TeX/texbin"];
  const current = env.PATH || "";
  const texmfVar = env.TEXMFVAR || path.join(os.tmpdir(), "oh-my-resume-texmf-var");
  fs.mkdirSync(texmfVar, { recursive: true });
  const existingTexInputs = env.TEXINPUTS || "";
  const resolvedTexInputs = texInputs.map((item) => path.resolve(item));
  return {
    ...env,
    PATH: [...additions, current].filter(Boolean).join(path.delimiter),
    TEXINPUTS: [...resolvedTexInputs, existingTexInputs].join(path.delimiter),
    TEXMFVAR: texmfVar
  };
}

function findCommand(command, env = process.env) {
  const paths = String(env.PATH || "").split(path.delimiter);
  for (const dir of paths) {
    const candidate = path.join(dir, command);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function commandExists(command) {
  const env = withTexPath(process.env);
  const bin = findCommand(command, env);
  if (!bin) return false;
  const result = spawnSync(bin, ["--version"], { encoding: "utf8", env });
  return result.status === 0;
}

function doctorCommand() {
  const checks = [
    ["node", true],
    ["xelatex", commandExists("xelatex")],
    ["latexmk", commandExists("latexmk")]
  ];
  for (const [name, ok] of checks) {
    console.log(`${ok ? "OK" : "MISSING"} ${name}`);
  }
  if (!checks.every(([, ok]) => ok)) {
    console.log("");
    console.log("Install TeX before generating PDF:");
    console.log("  macOS: brew install --cask mactex-no-gui");
    console.log("  Ubuntu/Debian: sudo apt-get install latexmk texlive-xetex texlive-lang-chinese");
    console.log("  Windows: install TeX Live or MiKTeX, then reopen the terminal");
    process.exitCode = 1;
  }
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "init") return initProject(args._[0]);
  if (command === "build") return buildCommand(args);
  if (command === "pdf") return pdfCommand(args);
  if (command === "debug") return debugCommand(args);
  if (command === "watch") return watchCommand(args);
  if (command === "doctor") return doctorCommand();

  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
