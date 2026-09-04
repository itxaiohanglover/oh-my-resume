#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { pathToFileURL, URL } = require("url");
const { buildHtmlResume, buildResume, readBuiltInLogos, readBuiltInSchoolLogos } = require("./build");

const packageRoot = path.resolve(__dirname, "..");
const builtInStylePresets = {
  classic: {
    label: "经典默认",
    config: {
      theme: {
        colors: {
          omrTagBg: "232,241,255",
          omrTagText: "37,99,235",
          omrSectionBg: "31,41,55",
          omrLinkColor: "37,99,235"
        },
        lengths: {
          omrPageMarginLeft: "8mm",
          omrPageMarginRight: "8mm",
          omrPageMarginTop: "8mm",
          omrPageMarginBottom: "8mm",
          omrHeaderGap: "7mm",
          omrHeaderNameGap: "0.41em",
          omrHeaderLineGap: "0.1em",
          omrNameMarginTop: "0em",
          omrNameMarginBottom: "0.41em",
          omrContactMarginTop: "0.1em",
          omrContactMarginBottom: "0.1em",
          omrLogoMarginTop: "0mm",
          omrLogoMarginBottom: "0mm"
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
        },
        options: {
          omrHeaderAlign: "left"
        }
      }
    }
  },
  compact: {
    label: "紧凑一页",
    config: {
      theme: {
        lengths: {
          omrPageMarginLeft: "7mm",
          omrPageMarginRight: "7mm",
          omrPageMarginTop: "7mm",
          omrPageMarginBottom: "6mm",
          omrSectionBefore: "0.42em",
          omrSectionAfter: "0.42em",
          omrEntryBefore: "0.16em",
          omrEntryAfter: "0.12em"
        },
        sizes: {
          omrBodyFontSize: "10.4pt",
          omrBodyLineHeight: "13.5pt",
          omrEntryFontSize: "10.2pt",
          omrEntryLineHeight: "12.6pt"
        }
      }
    }
  },
  currentComfort: {
    label: "当前舒适版",
    config: {
      theme: {
        colors: {
          omrTagBg: "243,244,246",
          omrTagText: "17,24,39",
          omrSectionBg: "17,24,39",
          omrLinkColor: "17,24,39"
        },
        lengths: {
          omrPageMarginLeft: "8mm",
          omrPageMarginRight: "8mm",
          omrPageMarginTop: "8mm",
          omrPageMarginBottom: "8mm",
          omrHeaderNameGap: "0.41em",
          omrHeaderLineGap: "0.1em",
          omrNameMarginTop: "0em",
          omrNameMarginBottom: "0.41em",
          omrContactMarginTop: "0.1em",
          omrContactMarginBottom: "0.1em",
          omrLogoMarginTop: "0mm",
          omrLogoMarginBottom: "0mm",
          omrTitleBodyGap: "0.38em",
          omrHeadingOneBefore: "0.42em",
          omrHeadingOneAfter: "0.22em",
          omrSectionBefore: "0.58em",
          omrSectionAfter: "0.54em",
          omrEntryBefore: "0.23em",
          omrEntryAfter: "0.22em"
        },
        fonts: {
          omrBodyFont: "TeX Gyre Termes",
          omrCJKMainFont: "Kaiti SC"
        },
        sizes: {
          omrBodyFontSize: "10.9pt",
          omrBodyLineHeight: "14.2pt",
          omrHOneFontSize: "16.9pt",
          omrHOneLineHeight: "19pt",
          omrSectionFontSize: "12.1pt",
          omrSectionLineHeight: "14.2pt",
          omrEntryFontSize: "10.5pt",
          omrEntryLineHeight: "13pt"
        },
        options: {
          omrHeaderAlign: "left"
        }
      }
    }
  }
};

function usage() {
  console.log(`oh-my-resume

Usage:
  oh-my-resume init [dir]
  oh-my-resume build [input.md] [--out build/resume.tex] [--config omr.config.json] [--theme classic]
  oh-my-resume html [input.md] [--out build/resume.html] [--config omr.config.json]
  oh-my-resume html-pdf [input.md] [--pdf resume-html.pdf] [--config omr.config.json]
  oh-my-resume pdf [input.md] [--out build/resume.tex] [--pdf resume.pdf] [--config omr.config.json]
  oh-my-resume export [input.md] [--out omr-export/resume-source] [--config omr.config.json]
  oh-my-resume debug [input.md] [--pdf resume.pdf] [--config omr.config.json] [--port 0] [--no-open]
  oh-my-resume watch [input.md] [--pdf resume.pdf] [--config omr.config.json]  # advanced
  oh-my-resume doctor

Examples:
  oh-my-resume init .
  oh-my-resume html resume.md
  oh-my-resume html-pdf resume.md
  oh-my-resume pdf resume.md
  oh-my-resume export resume.md
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
              omrSectionBg: "31,41,55",
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
              omrNameMarginTop: "0em",
              omrNameMarginBottom: "0.41em",
              omrContactMarginTop: "0.1em",
              omrContactMarginBottom: "0.1em",
              omrLogoMarginTop: "0mm",
              omrLogoMarginBottom: "0mm",
              omrTitleBodyGap: "0.38em",
              omrHeadingOneBefore: "0.42em",
              omrHeadingOneAfter: "0.22em",
              omrSectionBefore: "0.58em",
              omrSectionAfter: "0.54em",
              omrEntryBefore: "0.23em",
              omrEntryAfter: "0.22em",
              omrDividerGap: "0.3em",
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
              omrNameFontSize: "16.9pt",
              omrNameLineHeight: "19pt",
              omrContactFontSize: "10pt",
              omrContactLineHeight: "13pt",
              omrHOneFontSize: "16.9pt",
              omrHOneLineHeight: "19pt",
              omrSectionFontSize: "12.1pt",
              omrSectionLineHeight: "14.2pt",
              omrEntryFontSize: "10.5pt",
              omrEntryLineHeight: "13pt"
            },
            options: {
              omrHeaderAlign: "left"
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

function validateImportedConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("配置文件必须是 JSON 对象。");
  }
  for (const key of ["theme", "markdown", "logos", "schoolLogos", "resume"]) {
    if (value[key] !== undefined && (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key]))) {
      throw new Error(`配置字段 ${key} 必须是 JSON 对象。`);
    }
  }
  return value;
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  const descriptor = fs.openSync(temporary, "w");
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, file);
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

function defaultHtmlOutput(input) {
  const name = path.basename(input, path.extname(input));
  return path.join("build", `${name}.html`);
}

function defaultHtmlPdfOutput(input) {
  return `${path.basename(input, path.extname(input))}-html.pdf`;
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

function htmlCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const output = args.out || config.html || defaultHtmlOutput(input);
  const result = buildHtmlResume({
    cwd,
    input,
    output,
    config: args.config || (fs.existsSync(path.resolve(cwd, "omr.config.json")) ? "omr.config.json" : undefined)
  });
  if (!args.silent) {
    console.log(`Generated ${path.relative(cwd, result.output)} from ${path.relative(cwd, result.input)}`);
  }
  return result;
}

function htmlPdfCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const htmlOutput = args.out || config.html || defaultHtmlOutput(input);
  const html = htmlCommand({ ...args, _: [input], out: htmlOutput, silent: true });
  const pdf = path.resolve(cwd, args.pdf || config.htmlPdf || defaultHtmlPdfOutput(input));
  fs.mkdirSync(path.dirname(pdf), { recursive: true });

  const browser = findHtmlPdfBrowser(process.env);
  if (!browser) {
    throw new Error("No headless browser found for HTML PDF export. Install Google Chrome, Microsoft Edge, or Chromium, then retry. You can still open the HTML preview and print it to PDF from the browser.");
  }

  const result = spawnCommandSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${pdf}`,
    pathToFileURL(html.output).href
  ], {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0 || !fs.existsSync(pdf)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(detail || "HTML PDF export failed.");
  }
  if (!args.silent) {
    console.log(`Generated ${path.relative(cwd, pdf)} from ${path.relative(cwd, html.output)}`);
  }
  return { input: html.input, html: html.output, pdf };
}

function pdfCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const buildArgs = { ...args, _: [input] };
  const result = buildCommand(buildArgs);
  const pdf = path.resolve(cwd, args.pdf || config.pdf || defaultPdfOutput(input));
  const outDir = path.dirname(result.output);
  const generated = path.join(outDir, `${path.basename(result.output, ".tex")}.pdf`);
  fs.mkdirSync(path.dirname(pdf), { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const env = withTexPath(process.env, [path.dirname(result.output)]);
  const latexmkBin = findCommand("latexmk", env);
  if (!latexmkBin) {
    throw new Error("latexmk not found. Install MacTeX no-GUI or add /Library/TeX/texbin to PATH.");
  }

  const latexmk = spawnCommandSync(latexmkBin, [
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

  if (!fs.existsSync(generated)) {
    throw new Error(`PDF generation reported success but did not create ${path.relative(cwd, generated)}.`);
  }
  if (generated !== pdf) {
    fs.copyFileSync(generated, pdf);
  }
  if (!args.silent) {
    console.log(`Generated ${path.relative(cwd, pdf)}`);
  }
  return { input: result.input, tex: result.output, pdf };
}

function copyDirSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const item of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, item.name);
    const target = path.join(to, item.name);
    if (item.isDirectory()) copyDirSync(source, target);
    else if (item.isFile()) fs.copyFileSync(source, target);
  }
}

function exportSourcePackage(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const inputPath = path.resolve(cwd, input);
  const base = path.basename(input, path.extname(input));
  const exportRoot = path.resolve(cwd, args.out || path.join("omr-export", `${base}-source`));
  const runtimeRoot = path.join(exportRoot, "oh-my-resume");
  const latexDir = path.join(exportRoot, "latex");
  const htmlDir = path.join(exportRoot, "html");
  const configFile = path.resolve(cwd, args.config || "omr.config.json");

  fs.rmSync(exportRoot, { recursive: true, force: true });
  fs.mkdirSync(latexDir, { recursive: true });
  fs.mkdirSync(htmlDir, { recursive: true });
  copyDirSync(path.join(packageRoot, "src"), path.join(runtimeRoot, "src"));
  fs.copyFileSync(inputPath, path.join(exportRoot, path.basename(inputPath)));
  if (fs.existsSync(configFile)) fs.copyFileSync(configFile, path.join(exportRoot, "omr.config.json"));

  const tex = buildResume({
    cwd,
    input,
    output: path.join(latexDir, `${base}.tex`),
    config: fs.existsSync(configFile) ? path.relative(cwd, configFile) : undefined,
    theme: args.theme,
    packageRoot: runtimeRoot
  });
  const html = buildHtmlResume({
    cwd,
    input,
    output: path.join(htmlDir, `${base}.html`),
    config: fs.existsSync(configFile) ? path.relative(cwd, configFile) : undefined
  });
  fs.writeFileSync(path.join(exportRoot, "README.md"), [
    "# Oh My Resume Source Package",
    "",
    `- Markdown: ${path.basename(inputPath)}`,
    "- Config: omr.config.json",
    `- LaTeX: latex/${path.basename(tex.output)}`,
    `- HTML: html/${path.basename(html.output)}`,
    "",
    "Run LaTeX from the project root with xelatex/latexmk installed."
  ].join("\n"), "utf8");
  return { exportRoot, tex: tex.output, html: html.output };
}

function debugCommand(args) {
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.config);
  const configPath = path.resolve(cwd, args.config || "omr.config.json");
  const input = resolveMarkdownInput(cwd, config, args._[0]);
  const inputPath = path.resolve(cwd, input);
  const pdfPath = path.resolve(cwd, args.pdf || config.pdf || defaultPdfOutput(input));
  const htmlPath = path.resolve(cwd, config.html || defaultHtmlOutput(input));
  const htmlPdfPath = path.resolve(cwd, config.htmlPdf || defaultHtmlPdfOutput(input));
  const builtInLogos = readBuiltInLogos(packageRoot).map((item) => ({
    id: item.id,
    label: item.label,
    color: item.color || "brand",
    url: `/builtin-logo/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.color || "brand")}`
  }));
  const builtInSchoolLogos = readBuiltInSchoolLogos(packageRoot).map((item) => ({
    id: item.id,
    label: item.label,
    url: `/builtin-school-logo/${encodeURIComponent(item.id)}`
  }));

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Markdown file not found: ${input}`);
  }

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, "http://127.0.0.1");

    if (req.method === "GET" && requestUrl.pathname === "/") {
      send(res, 200, debugHtml(path.basename(inputPath), builtInLogos, builtInSchoolLogos));
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/favicon.ico") {
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end();
      return;
    }

    if (req.method === "GET" && requestUrl.pathname.startsWith("/builtin-logo/")) {
      const id = decodeURIComponent(requestUrl.pathname.slice("/builtin-logo/".length));
      const item = readBuiltInLogos(packageRoot).find((logo) => logo.id === id);
      if (!item) {
        send(res, 404, "Logo not found", "text/plain; charset=utf-8");
        return;
      }
      const file = path.join(packageRoot, "src", "logos", item.file);
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(res);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname.startsWith("/builtin-school-logo/")) {
      const id = decodeURIComponent(requestUrl.pathname.slice("/builtin-school-logo/".length));
      const item = readBuiltInSchoolLogos(packageRoot).find((logo) => logo.id === id);
      if (!item) {
        send(res, 404, "School logo not found", "text/plain; charset=utf-8");
        return;
      }
      const file = path.join(packageRoot, "src", "school-logos", item.file);
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(res);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/state") {
      sendJson(res, 200, {
        input: path.relative(cwd, inputPath),
        pdf: path.relative(cwd, pdfPath),
        markdown: fs.readFileSync(inputPath, "utf8"),
        config: normalizeDebugConfig(loadConfig(cwd, args.config)),
        configPath: path.relative(cwd, configPath),
        pdfUrl: fs.existsSync(pdfPath) ? `/pdf?ts=${Date.now()}` : null,
        htmlUrl: fs.existsSync(htmlPath) ? `/html?ts=${Date.now()}` : null,
        htmlPdf: path.relative(cwd, htmlPdfPath),
        engine: config.engine || "latex",
        builtInLogos,
        builtInSchoolLogos
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/import-config") {
      readJsonBody(req)
        .then((body) => {
          const next = validateImportedConfig(body.config);
          writeJsonAtomic(configPath, next);
          sendJson(res, 200, {
            ok: true,
            config: normalizeDebugConfig(next),
            path: path.relative(cwd, configPath)
          });
        })
        .catch((error) => {
          sendJson(res, 400, {
            ok: false,
            error: trimError(error.message || String(error))
          });
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
          if (typeof body.markdown !== "string") {
            throw new Error("Render request must include a markdown string.");
          }
          fs.writeFileSync(inputPath, body.markdown, "utf8");
          const engine = String(body.engine || "latex");
          if (engine === "html") {
            const result = htmlCommand({ ...args, _: [input], out: path.relative(cwd, htmlPath), silent: true });
            sendJson(res, 200, {
              ok: true,
              input: path.relative(cwd, result.input),
              html: path.relative(cwd, result.output),
              htmlUrl: `/html?ts=${Date.now()}`
            });
            return;
          }
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

    if (req.method === "POST" && requestUrl.pathname === "/api/export-source") {
      readJsonBody(req)
        .then((body) => {
          if (typeof body.markdown === "string") fs.writeFileSync(inputPath, body.markdown, "utf8");
          const result = exportSourcePackage({ ...args, _: [input] });
          sendJson(res, 200, {
            ok: true,
            path: path.relative(cwd, result.exportRoot),
            tex: path.relative(cwd, result.tex),
            html: path.relative(cwd, result.html)
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

    if (req.method === "POST" && requestUrl.pathname === "/api/html-pdf") {
      readJsonBody(req)
        .then((body) => {
          if (typeof body.markdown === "string") fs.writeFileSync(inputPath, body.markdown, "utf8");
          const result = htmlPdfCommand({ ...args, _: [input], pdf: path.relative(cwd, htmlPdfPath), silent: true });
          sendJson(res, 200, {
            ok: true,
            input: path.relative(cwd, result.input),
            html: path.relative(cwd, result.html),
            pdf: path.relative(cwd, result.pdf),
            pdfUrl: `/html-pdf?ts=${Date.now()}`
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

    if (req.method === "GET" && requestUrl.pathname === "/html") {
      if (!fs.existsSync(htmlPath)) {
        send(res, 404, "HTML has not been generated yet.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/html-pdf") {
      if (!fs.existsSync(htmlPdfPath)) {
        send(res, 404, "HTML PDF has not been generated yet.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(htmlPdfPath).pipe(res);
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
    ...config,
    theme: {
      colors: {
        omrTagBg: "232,241,255",
        omrTagText: "37,99,235",
        omrSectionBg: "31,41,55",
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
        omrNameMarginTop: "0em",
        omrNameMarginBottom: "0.41em",
        omrContactMarginTop: "0.1em",
        omrContactMarginBottom: "0.1em",
        omrLogoMarginTop: "0mm",
        omrLogoMarginBottom: "0mm",
        omrTitleBodyGap: "0.38em",
        omrHeadingOneBefore: "0.42em",
        omrHeadingOneAfter: "0.22em",
        omrSectionBefore: "0.58em",
        omrSectionAfter: "0.54em",
        omrEntryBefore: "0.23em",
        omrEntryAfter: "0.22em",
        omrDividerGap: "0.3em",
        omrEntryDateWidth: "39mm",
        omrPhotoRightInset: "0mm",
        omrLogoHeight: "1.2cm",
        omrInlineLogoHeight: "1em",
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
        omrNameFontSize: "16.9pt",
        omrNameLineHeight: "19pt",
        omrContactFontSize: "10pt",
        omrContactLineHeight: "13pt",
        omrHOneFontSize: "16.9pt",
        omrHOneLineHeight: "19pt",
        omrSectionFontSize: "12.1pt",
        omrSectionLineHeight: "14.2pt",
        omrEntryFontSize: "10.5pt",
        omrEntryLineHeight: "13pt",
        ...(theme.sizes || {})
      },
      options: {
        omrHeaderAlign: "left",
        sectionStyle: "classic",
        ...(theme.options || {})
      }
    },
    markdown: {
      dateFields: ["时间", "日期", "date", "dates"],
      tagFields: ["标签", "tags"],
      centerOpen: "<center>",
      centerClose: "</center>",
      leftOpen: "<left>",
      leftClose: "</left>",
      rightOpen: "<right>",
      rightClose: "</right>",
      ...(config.markdown || {})
    },
    logos: { ...(config.logos || {}) },
    schoolLogos: { ...(config.schoolLogos || {}) }
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
      sizes: cleanObject(normalized.theme.sizes, isFontSize),
      options: cleanObject(normalized.theme.options, isThemeOption)
    },
    markdown: {
      ...(current.markdown || {}),
      dateFields: cleanStringList(normalized.markdown.dateFields),
      tagFields: cleanStringList(normalized.markdown.tagFields),
      centerOpen: cleanTag(normalized.markdown.centerOpen),
      centerClose: cleanTag(normalized.markdown.centerClose),
      leftOpen: cleanTag(normalized.markdown.leftOpen),
      leftClose: cleanTag(normalized.markdown.leftClose),
      rightOpen: cleanTag(normalized.markdown.rightOpen),
      rightClose: cleanTag(normalized.markdown.rightClose)
    },
    logos: cleanLogoMap(normalized.logos),
    schoolLogos: cleanLogoMap(normalized.schoolLogos)
  };
}

function cleanLogoMap(value) {
  const result = {};
  for (const [key, file] of Object.entries(value || {})) {
    const normalized = String(key).trim().toLowerCase();
    const source = String(file).trim();
    if (/^[a-z0-9][a-z0-9-]*$/.test(normalized) && source && !source.includes("\0")) {
      result[normalized] = source;
    }
  }
  return result;
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

function cleanTag(value) {
  const s = String(value || "").trim();
  if (!s || s.length > 20) return null;
  if (/[\\{}]/.test(s)) return null;
  return s;
}

function isRgb(value) {
  return /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value);
}

function isLength(value) {
  const numValue = String(value).trim();
  // Check if it has unit
  if (/^[0-9.]+(mm|cm|pt|em|ex)$/.test(numValue)) {
    return true;
  }
  // Check if it's a plain number and add default unit
  if (/^[0-9.]+$/.test(numValue)) {
    return true;
  }
  return false;
}

function isFontName(value) {
  return value.length > 0 && value.length < 80 && !/[{}\\]/.test(value);
}

function isFontSize(value) {
  return /^[0-9.]+pt$/.test(value);
}

function isThemeOption(value) {
  return ["left", "center", "refined", "simple", "classic", "premium", "minimal", "professional"].includes(String(value).trim());
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

function debugHtml(fileName, builtInLogos = [], builtInSchoolLogos = []) {
  const cjkFontOptions = process.platform === "win32"
    ? [
        ["SimSun", "宋体"],
        ["KaiTi", "楷体"],
        ["Microsoft YaHei", "微软雅黑"],
        ["Noto Serif CJK SC", "Noto Serif"]
      ]
    : process.platform === "darwin"
      ? [
          ["Songti SC", "宋体"],
          ["Kaiti SC", "楷体"],
          ["PingFang SC", "苹方"],
          ["Noto Serif CJK SC", "Noto Serif"]
        ]
      : [
          ["FandolSong-Regular", "宋体"],
          ["FandolKai-Regular", "楷体"],
          ["Noto Serif CJK SC", "Noto Serif"]
        ];
  const builtInLogoButtons = builtInLogos.map((logo) => `
            <button class="logoChip builtinLogoChip" type="button" data-logo-id="${escapeHtml(logo.id)}" title="&lt;logo&gt;${escapeHtml(logo.id)}&lt;/logo&gt;">
              <img src="${escapeHtml(logo.url)}" alt=""><span>${escapeHtml(logo.label)}</span>
            </button>`).join("");
  const builtInSchoolLogoButtons = builtInSchoolLogos.map((logo) => `
            <button class="logoChip builtinSchoolLogoChip" type="button" data-logo-id="${escapeHtml(logo.id)}" title="&lt;school-logo&gt;${escapeHtml(logo.id)}&lt;/school-logo&gt;">
              <img src="${escapeHtml(logo.url)}" alt=""><span>${escapeHtml(logo.label)}</span>
            </button>`).join("");
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
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .settingsSection {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fff;
      gap: 8px;
    }
    .settingsTitle {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      align-self: flex-start;
    }
    .settingsTitle svg {
      flex: 0 0 auto;
      opacity: 0.7;
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
    .categoryGrid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .logoLibrary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .logoPresetGroup {
      display: grid;
      gap: 7px;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #f8fafc;
    }
    .logoChip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 5px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
    }
    .logoChip:hover { border-color: var(--accent); background: #f8fbff; }
    .logoChip img { width: 23px; height: 23px; padding: 2px; border-radius: 4px; background: #eef1f5; object-fit: contain; }
    .logoRemove { width: 26px; min-height: 30px; padding: 0; font-size: 16px; }
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
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="toolbar">
      <div class="title">Oh My Resume · ${escapeHtml(fileName)}</div>
      <div class="actions">
        <span class="menuItem"><span class="menuIcon">渲染引擎</span><select id="engineSelect"><option value="latex">LaTeX PDF</option><option value="html">HTML 快速预览</option></select></span>
        <button class="ghost" id="style">样式设置</button>
        <button class="ghost" id="exportSource">导出源码</button>
        <button class="ghost" id="exportHtmlPdf">HTML 导出 PDF</button>
        <button id="render">渲染</button>
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
      <span style="display:inline-flex;align-items:baseline;gap:8px;"><span>样式设置</span><span style="color:var(--muted);font-size:12px;font-weight:400;">数值会直接写入 omr.config.json，支持 mm、cm、pt、em 等 LaTeX 单位。</span></span>
      <button class="ghost" id="closeStyle">关闭</button>
    </div>
    <div class="styleBody">
      <div class="quickMenu">
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>配置</p>
          <div class="settingsRow">
            <input id="configImportFile" type="file" accept=".json,application/json" hidden>
            <button class="ghost" id="exportCurrentConfig" type="button">导出当前配置</button>
            <button class="ghost" id="importCurrentConfig" type="button">导入并替换</button>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>版式</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">头部</span><select id="quickHeaderAlign"></select></span>
            <span class="menuItem"><span class="menuIcon">风格</span><select id="quickSectionStyle"></select></span>
            <span class="menuItem">
              <span class="menuIcon">行间距（em）</span>
              <select id="spacingLevel">
                <option value="section">二级标题</option>
                <option value="entry">三级标题</option>
              </select>
              <span style="font-size:11px;color:var(--muted);">上</span><input id="quickSpacingBefore" placeholder="0.58" style="width:38px;">
              <span style="font-size:11px;color:var(--muted);">下</span><input id="quickSpacingAfter" placeholder="0.54" style="width:38px;">
            </span>
            <span class="menuItem"><span class="menuIcon">*** 分割线上下间距（em）</span><input id="quickDividerGap" placeholder="0.3" style="width:54px;"></span>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">页边距（mm）</span><select id="quickMarginPreset">
              <option value="">自定义</option>
              <option value="8,8,8,8">普通</option>
              <option value="6,6,6,6">窄</option>
              <option value="10,10,10,10">适中</option>
              <option value="14,14,10,10">宽</option>
            </select><span style="font-size:11px;color:var(--muted);">上</span><input id="quickMarginTop" placeholder="8" style="width:62px;"><span style="font-size:11px;color:var(--muted);">下</span><input id="quickMarginBottom" placeholder="8" style="width:62px;"><span style="font-size:11px;color:var(--muted);">左</span><input id="quickMarginLeft" placeholder="8" style="width:62px;"><span style="font-size:11px;color:var(--muted);">右</span><input id="quickMarginRight" placeholder="8" style="width:62px;"></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 7 5 4 19 4 19 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="9" y1="20" x2="15" y2="20"/></svg>字体</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">中文字体</span><select id="quickFont"></select></span>
            <span class="menuItem"><span class="menuIcon">英文字体</span><select id="quickEnFont"></select></span>
            <span class="menuItem"><span class="menuIcon">正文字号（pt）</span><input id="quickBodySize" placeholder="11.2" style="width:54px;"></span>
            <span class="menuItem"><span class="menuIcon">二级标题字号（pt）</span><input id="quickSectionSize" placeholder="12.1" style="width:54px;"></span>
            <span class="menuItem"><span class="menuIcon">三级标题字号（pt）</span><input id="quickEntrySize" placeholder="10.5" style="width:54px;"></span>
            <span class="menuItem"><span class="menuIcon">正文行高（pt）</span><input id="quickLine" placeholder="14.5"></span>
            <span class="menuItem"><span class="menuIcon">二级标题框高（pt）</span><input id="quickSectionLine" placeholder="14.2"></span>
            <span class="menuItem"><span class="menuIcon">对齐方式</span><select id="alignTypeSelect">
              <option value="center">居中</option>
              <option value="left">左对齐</option>
              <option value="right">右对齐</option>
            </select><span style="font-size:11px;color:var(--muted);">开</span><input id="alignOpen" placeholder="<center>" style="width:80px;"><span style="font-size:11px;color:var(--muted);">闭</span><input id="alignClose" placeholder="</center>" style="width:80px;"><span style="font-size:10px;color:var(--muted);margin-left:4px;">请输入你喜欢的命名方式</span></span>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">姓名字号（pt）</span><input id="quickNameSize" placeholder="16.9"></span>
            <span class="menuItem"><span class="menuIcon">姓名行高（pt）</span><input id="quickNameLine" placeholder="19"></span>
            <span class="menuItem"><span class="menuIcon">联系方式字号（pt）</span><input id="quickContactSize" placeholder="10"></span>
            <span class="menuItem"><span class="menuIcon">联系方式行高（pt）</span><input id="quickContactLine" placeholder="13"></span>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">姓名上间距（em）</span><input id="quickNameMarginTop" placeholder="0"></span>
            <span class="menuItem"><span class="menuIcon">姓名下间距（em）</span><input id="quickNameMarginBottom" placeholder="0.41"></span>
            <span class="menuItem"><span class="menuIcon">联系方式上间距（em）</span><input id="quickContactMarginTop" placeholder="0.1"></span>
            <span class="menuItem"><span class="menuIcon">联系方式下间距（em）</span><input id="quickContactMarginBottom" placeholder="0.1"></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>主题</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">预设</span><span class="swatches" id="quickTheme"></span></span>
            <span class="menuItem"><span class="menuIcon">自定义</span><input type="color" id="customColor" value="#2563eb" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">链接色</span><input type="color" id="quickLinkColor" value="#2563eb" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">标签背景</span><input type="color" id="quickTagBg" value="#e5f1ff" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">标签文字</span><input type="color" id="quickTagText" value="#2563eb" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">标题样式</span><input type="color" id="quickSectionBg" value="#1f2937" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">彩色条 · 灰</span><input type="color" id="quickColorGrayBg" value="#f3f4f6" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">彩色条 · 粉</span><input type="color" id="quickColorPinkBg" value="#ffefef" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
            <span class="menuItem"><span class="menuIcon">彩色条 · 蓝</span><input type="color" id="quickColorBlueBg" value="#e8f1ff" style="width:24px;height:24px;border:0;cursor:pointer;background:transparent;padding:0;"></span>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">彩色条标签</span><span class="logoLibrary" id="colorPresetList">
              <button class="logoChip colorPresetChip" type="button" data-color="gray" title="&lt;color=&quot;gray&quot;&gt;...&lt;/color&gt;">灰色</button>
              <button class="logoChip colorPresetChip" type="button" data-color="pink" title="&lt;color=&quot;pink&quot;&gt;...&lt;/color&gt;">粉色</button>
              <button class="logoChip colorPresetChip" type="button" data-color="blue" title="&lt;color=&quot;blue&quot;&gt;...&lt;/color&gt;">蓝色</button>
            </span></span>
            <span style="font-size:11px;color:var(--muted);">选中文本后点击，即自动包裹为 <code>&lt;color=&quot;…&quot;&gt;</code></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>图片</p>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">照片右侧缩进（mm）</span><input id="quickPhotoInset" placeholder="0"></span>
            <span class="menuItem"><span class="menuIcon">个人照片高度（cm）</span><input id="quickPhoto" placeholder="2.75"></span>
            <span class="menuItem"><span class="menuIcon">学校logo高度（cm）</span><input id="quickLogo" placeholder="1.2"></span>
            <span class="menuItem"><span class="menuIcon">行内logo高度（em）</span><input id="quickInlineLogo" placeholder="1"></span>
            <span class="menuItem"><span class="menuIcon">学校logo上间距（mm）</span><input id="quickLogoMarginTop" placeholder="0"></span>
            <span class="menuItem"><span class="menuIcon">学校logo下间距（mm）</span><input id="quickLogoMarginBottom" placeholder="0"></span>
          </div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>学校 Logo</p>
          <div class="logoPresetGroup">
            <div class="logoLibrary" id="builtinSchoolLogoList">${builtInSchoolLogoButtons}
            </div>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">自定义 key</span><input id="customSchoolLogoKey" placeholder="my-school" style="width:110px;"></span>
            <span class="menuItem"><span class="menuIcon">图片路径</span><input id="customSchoolLogoPath" placeholder="logos/school.png" style="width:190px;"></span>
            <button class="ghost" id="addCustomSchoolLogo" type="button">添加</button>
          </div>
          <div class="logoLibrary" id="customSchoolLogoList"></div>
        </section>
        <section class="settingsSection">
          <p class="settingsTitle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16v10H4z"/><path d="M8 7V4h8v3M8 17v3h8v-3"/></svg>企业 Logo</p>
          <div class="logoPresetGroup">
            <div class="logoLibrary" id="builtinLogoList">${builtInLogoButtons}
            </div>
          </div>
          <div class="settingsRow">
            <span class="menuItem"><span class="menuIcon">自定义 key</span><input id="customLogoKey" placeholder="my-company" style="width:110px;"></span>
            <span class="menuItem"><span class="menuIcon">图片路径</span><input id="customLogoPath" placeholder="logos/company.png" style="width:190px;"></span>
            <button class="ghost" id="addCustomLogo" type="button">添加</button>
          </div>
          <div class="logoLibrary" id="customLogoList"></div>
        </section>
      </div>
    </div>
    <div class="dialogActions">
      <button class="ghost" id="resetStyle">重新加载</button>
      <button id="saveStyle">保存样式</button>
    </div>
  </dialog>
  <script>
    const editor = document.getElementById("editor");
    const renderButton = document.getElementById("render");
    const engineSelect = document.getElementById("engineSelect");
    const exportSource = document.getElementById("exportSource");
    const exportHtmlPdf = document.getElementById("exportHtmlPdf");
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
    const configImportFile = document.getElementById("configImportFile");
    const exportCurrentConfig = document.getElementById("exportCurrentConfig");
    const importCurrentConfig = document.getElementById("importCurrentConfig");
    const quickFont = document.getElementById("quickFont");
    const quickEnFont = document.getElementById("quickEnFont");
    const quickBodySize = document.getElementById("quickBodySize");
    const quickSectionSize = document.getElementById("quickSectionSize");
    const quickEntrySize = document.getElementById("quickEntrySize");
    const quickLine = document.getElementById("quickLine");
    const quickSectionLine = document.getElementById("quickSectionLine");
    const quickNameSize = document.getElementById("quickNameSize");
    const quickNameLine = document.getElementById("quickNameLine");
    const quickContactSize = document.getElementById("quickContactSize");
    const quickContactLine = document.getElementById("quickContactLine");
    const quickNameMarginTop = document.getElementById("quickNameMarginTop");
    const quickNameMarginBottom = document.getElementById("quickNameMarginBottom");
    const quickContactMarginTop = document.getElementById("quickContactMarginTop");
    const quickContactMarginBottom = document.getElementById("quickContactMarginBottom");
    const spacingLevel = document.getElementById("spacingLevel");
    const quickSpacingBefore = document.getElementById("quickSpacingBefore");
    const quickSpacingAfter = document.getElementById("quickSpacingAfter");
    const quickDividerGap = document.getElementById("quickDividerGap");
    const quickMarginPreset = document.getElementById("quickMarginPreset");
    const quickMarginTop = document.getElementById("quickMarginTop");
    const quickMarginBottom = document.getElementById("quickMarginBottom");
    const quickMarginLeft = document.getElementById("quickMarginLeft");
    const quickMarginRight = document.getElementById("quickMarginRight");
    const quickPhoto = document.getElementById("quickPhoto");
    const quickLogo = document.getElementById("quickLogo");
    const quickInlineLogo = document.getElementById("quickInlineLogo");
    const quickLogoMarginTop = document.getElementById("quickLogoMarginTop");
    const quickLogoMarginBottom = document.getElementById("quickLogoMarginBottom");
    const quickPhotoInset = document.getElementById("quickPhotoInset");
    const quickHeaderAlign = document.getElementById("quickHeaderAlign");
    const quickSectionStyle = document.getElementById("quickSectionStyle");
    const quickTheme = document.getElementById("quickTheme");
    const customColor = document.getElementById("customColor");
    const quickTagBg = document.getElementById("quickTagBg");
    const quickTagText = document.getElementById("quickTagText");
    const quickSectionBg = document.getElementById("quickSectionBg");
    const quickLinkColor = document.getElementById("quickLinkColor");
    const quickColorGrayBg = document.getElementById("quickColorGrayBg");
    const quickColorPinkBg = document.getElementById("quickColorPinkBg");
    const quickColorBlueBg = document.getElementById("quickColorBlueBg");
    const colorPresetList = document.getElementById("colorPresetList");
    const alignTypeSelect = document.getElementById("alignTypeSelect");
    const alignOpen = document.getElementById("alignOpen");
    const alignClose = document.getElementById("alignClose");
    const builtinLogoList = document.getElementById("builtinLogoList");
    const customLogoList = document.getElementById("customLogoList");
    const customLogoKey = document.getElementById("customLogoKey");
    const customLogoPath = document.getElementById("customLogoPath");
    const addCustomLogo = document.getElementById("addCustomLogo");
    const builtinSchoolLogoList = document.getElementById("builtinSchoolLogoList");
    const customSchoolLogoList = document.getElementById("customSchoolLogoList");
    const customSchoolLogoKey = document.getElementById("customSchoolLogoKey");
    const customSchoolLogoPath = document.getElementById("customSchoolLogoPath");
    const addCustomSchoolLogo = document.getElementById("addCustomSchoolLogo");
    let currentConfig = null;
    let currentConfigPath = "omr.config.json";

    const alignOptions = [
      ["left", "靠左"],
      ["center", "居中"]
    ];
    const sectionStyleOptions = [
      ["minimal", "极简"],
      ["simple", "简洁"],
      ["classic", "经典"],
      ["premium", "高级"],
      ["refined", "雅致"],
      ["professional", "专业"]
    ];
    const fontOptions = ${JSON.stringify(cjkFontOptions)};
    const enFontOptions = [
      ["TeX Gyre Termes", "TeX Gyre Termes"],
      ["Times New Roman", "Times New Roman"],
      ["TeX Gyre Pagella", "TeX Gyre Pagella"],
      ["TeX Gyre Heros", "TeX Gyre Heros"],
      ["Latin Modern Roman", "Latin Modern Roman"],
      ["Latin Modern Sans", "Latin Modern Sans"],
      ["Helvetica", "Helvetica"]
    ];
    const marginPresetOptions = [
      ["", "自定义"],
      ["8,8,8,8", "普通"],
      ["6,6,6,6", "窄"],
      ["10,10,10,10", "适中"],
      ["14,14,10,10", "宽"]
    ];
    function applyMarginPreset(value) {
      if (!value) return;
      const parts = value.split(",");
      if (parts.length !== 4) return;
      quickMarginTop.value = parts[0];
      quickMarginBottom.value = parts[1];
      quickMarginLeft.value = parts[2];
      quickMarginRight.value = parts[3];
      applyQuickConfig();
    }
    function calcTagBg(rgb) {
      const parts = rgb.split(",").map(n => Math.round(parseInt(n.trim()) * 0.1 + 229.5));
      return parts.join(",");
    }

    const themeOptions = [
      { name: "blue", color: "37,99,235", tagBg: "232,241,255", sectionBg: "37,99,235" },
      { name: "black", color: "17,24,39", tagBg: "243,244,246", sectionBg: "17,24,39" },
      { name: "green", color: "15,118,110", tagBg: "225,245,238", sectionBg: "15,118,110" },
      { name: "slate", color: "51,65,85", tagBg: "241,245,249", sectionBg: "51,65,85" },
      { name: "red", color: "155,0,0", tagBg: "245,230,230", sectionBg: "155,0,0" }
    ];

    const categoryFields = {
      font: [],
    };

    async function loadState() {
      const response = await fetch("/api/state");
      const state = await response.json();
      editor.value = state.markdown;
      currentConfig = state.config;
      currentConfigPath = state.configPath || "omr.config.json";
      renderCategoryFields();
      renderQuickControls();
      renderLogoLibrary();
      renderSchoolLogoLibrary();
      renderColorPresetLibrary();
      captureAlignTags();
      paths.textContent = state.input + " -> " + state.pdf;
      engineSelect.value = state.engine === "html" ? "html" : "latex";
      syncEngineActions();
      if (engineSelect.value === "html" && state.htmlUrl) showPreview(state.htmlUrl, "HTML 预览");
      else if (state.pdfUrl) showPreview(state.pdfUrl, "PDF 预览");
    }

    function syncEngineActions() {
      exportHtmlPdf.hidden = engineSelect.value !== "html";
    }

    function showPreview(url, title) {
      preview.innerHTML = "";
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = title;
      preview.appendChild(frame);
    }

    async function render() {
      renderButton.disabled = true;
      message.className = "";
      message.textContent = "正在渲染...";
      try {
        await flushConfigToServer();
        const engine = engineSelect.value || "latex";
        const response = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: editor.value, engine })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "渲染失败。");
        syncEngineActions();
        if (engine === "html") showPreview(data.htmlUrl, "HTML 预览");
        else showPreview(data.pdfUrl, "PDF 预览");
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

    // Helper function to extract number from value
    function extractNumber(value) {
      if (!value) return "";
      const match = value.toString().match(/^(\\d+(?:\\.\\d+)?)/);
      return match ? match[1] : "";
    }

    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return r + "," + g + "," + b;
    }
    function rgbToHex(rgb) {
      const parts = String(rgb).split(",").map(s => parseInt(s.trim()));
      if (parts.length !== 3 || parts.some(n => isNaN(n))) return "#000000";
      return "#" + parts.map(n => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0")).join("");
    }

    // Helper function to get unit based on path
    function getUnit(path) {
      if (path.includes("FontSize") || path.includes("LineHeight")) return "pt";
      if (path.includes("Margin") || path.includes("Width") || path.includes("Inset")) return "mm";
      if (path.includes("Height")) return "cm";
      if (path.includes("Before") || path.includes("After")) return "em";
      return "";
    }

    function renderCategoryFields() {
      for (const el of document.querySelectorAll(".categoryGrid")) {
        const category = el.dataset.category;
        const fields = categoryFields[category] || [];
        el.innerHTML = "";
        for (const [path, label] of fields) {
          const fullValue = getPath(currentConfig, path) || "";
          const isColor = path.startsWith("theme.colors.");
          if (isColor) {
            const span = document.createElement("span");
            span.className = "menuItem";
            const icon = document.createElement("span");
            icon.className = "menuIcon";
            icon.textContent = label;
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.dataset.path = path;
            colorInput.dataset.rgb = fullValue;
            colorInput.value = rgbToHex(fullValue);
            colorInput.style.cssText = "width:24px;height:24px;border:0;border-radius:3px;padding:0;cursor:pointer;background:transparent;flex:0 0 auto;";
            colorInput.addEventListener("input", () => {
              colorInput.dataset.rgb = hexToRgb(colorInput.value);
            });
            const textInput = document.createElement("input");
            textInput.style.cssText = "width:70px;";
            textInput.value = fullValue;
            textInput.placeholder = "R,G,B";
            textInput.addEventListener("input", () => {
              const hex = rgbToHex(textInput.value);
              colorInput.value = hex;
              colorInput.dataset.rgb = textInput.value;
            });
            span.append(icon, colorInput, textInput);
            el.appendChild(span);
          } else if (path.endsWith("Font")) {
            const span = document.createElement("span");
            span.className = "menuItem";
            const icon = document.createElement("span");
            icon.className = "menuIcon";
            icon.textContent = label;
            const select = document.createElement("select");
            select.dataset.path = path;
            const options = path === "theme.fonts.omrBodyFont" ? enFontOptions : fontOptions;
            for (const [value, text] of options) {
              const option = document.createElement("option");
              option.value = value;
              option.textContent = text;
              if (value === fullValue) option.selected = true;
              select.appendChild(option);
            }
            span.append(icon, select);
            el.appendChild(span);
          } else {
            const span = document.createElement("span");
            span.className = "menuItem";
            const icon = document.createElement("span");
            icon.className = "menuIcon";
            icon.textContent = label;
            const input = document.createElement("input");
            input.dataset.path = path;
            const unit = getUnit(path);
            input.value = unit ? extractNumber(fullValue) : fullValue;
            span.append(icon, input);
            el.appendChild(span);
          }
        }
      }
    }

    function renderQuickControls() {
      fillSelect(quickHeaderAlign, alignOptions, getPath(currentConfig, "theme.options.omrHeaderAlign"));
      fillSelect(quickSectionStyle, sectionStyleOptions, getPath(currentConfig, "theme.options.sectionStyle") || "classic");
      fillSelect(quickFont, fontOptions.map(([value, label]) => [value, label]), getPath(currentConfig, "theme.fonts.omrCJKMainFont"));
      fillSelect(quickEnFont, enFontOptions, getPath(currentConfig, "theme.fonts.omrBodyFont"));
      quickBodySize.value = extractNumber(getPath(currentConfig, "theme.sizes.omrBodyFontSize"));
      quickSectionSize.value = extractNumber(getPath(currentConfig, "theme.sizes.omrSectionFontSize"));
      quickEntrySize.value = extractNumber(getPath(currentConfig, "theme.sizes.omrEntryFontSize"));
      quickLine.value = extractNumber(getPath(currentConfig, "theme.sizes.omrBodyLineHeight"));
      quickSectionLine.value = extractNumber(getPath(currentConfig, "theme.sizes.omrSectionLineHeight"));
      quickNameSize.value = extractNumber(getPath(currentConfig, "theme.sizes.omrNameFontSize"));
      quickNameLine.value = extractNumber(getPath(currentConfig, "theme.sizes.omrNameLineHeight"));
      quickContactSize.value = extractNumber(getPath(currentConfig, "theme.sizes.omrContactFontSize"));
      quickContactLine.value = extractNumber(getPath(currentConfig, "theme.sizes.omrContactLineHeight"));
      quickNameMarginTop.value = extractNumber(getPath(currentConfig, "theme.lengths.omrNameMarginTop"));
      quickNameMarginBottom.value = extractNumber(getPath(currentConfig, "theme.lengths.omrNameMarginBottom"));
      quickContactMarginTop.value = extractNumber(getPath(currentConfig, "theme.lengths.omrContactMarginTop"));
      quickContactMarginBottom.value = extractNumber(getPath(currentConfig, "theme.lengths.omrContactMarginBottom"));
      quickMarginTop.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPageMarginTop"));
      quickMarginBottom.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPageMarginBottom"));
      quickMarginLeft.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPageMarginLeft"));
      quickMarginRight.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPageMarginRight"));
      renderSpacingInputs();
      quickDividerGap.value = extractNumber(getPath(currentConfig, "theme.lengths.omrDividerGap"));
      fillSelect(quickMarginPreset, marginPresetOptions, "");
      renderAlignControls();
      quickPhoto.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPhotoHeight"));
      quickLogo.value = extractNumber(getPath(currentConfig, "theme.lengths.omrLogoHeight"));
      quickInlineLogo.value = extractNumber(getPath(currentConfig, "theme.lengths.omrInlineLogoHeight"));
      quickLogoMarginTop.value = extractNumber(getPath(currentConfig, "theme.lengths.omrLogoMarginTop"));
      quickLogoMarginBottom.value = extractNumber(getPath(currentConfig, "theme.lengths.omrLogoMarginBottom"));
      quickPhotoInset.value = extractNumber(getPath(currentConfig, "theme.lengths.omrPhotoRightInset"));
      quickTagBg.value = rgbToHex(getPath(currentConfig, "theme.colors.omrTagBg"));
      quickTagText.value = rgbToHex(getPath(currentConfig, "theme.colors.omrTagText"));
      quickSectionBg.value = rgbToHex(getPath(currentConfig, "theme.colors.omrSectionBg"));
      quickLinkColor.value = rgbToHex(getPath(currentConfig, "theme.colors.omrLinkColor"));
      quickColorGrayBg.value = rgbToHex(getPath(currentConfig, "theme.colors.omrColorGrayBg") || "243,244,246");
      quickColorPinkBg.value = rgbToHex(getPath(currentConfig, "theme.colors.omrColorPinkBg") || "255,239,239");
      quickColorBlueBg.value = rgbToHex(getPath(currentConfig, "theme.colors.omrColorBlueBg") || "232,241,255");
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
setPath(currentConfig, "theme.colors.omrTagBg", theme.tagBg);
          setPath(currentConfig, "theme.colors.omrSectionBg", theme.sectionBg);
          renderCategoryFields();
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
      const isList = path.startsWith("markdown.") && !path.endsWith("Open") && !path.endsWith("Close");
      cursor[key] = isList ? value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) : value.trim();
    }

    function insertAtCursor(value) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText(value, start, end, "end");
      editor.focus();
    }

    function setFrontmatterField(key, value) {
      const source = editor.value;
      const match = source.match(/^(---\\r?\\n)([\\s\\S]*?)(\\r?\\n---(?:\\r?\\n|$))/);
      if (!match) {
        editor.value = "---\\n" + key + ": " + value + "\\n---\\n\\n" + source;
        editor.focus();
        return;
      }
      const lines = match[2].split(/\\r?\\n/);
      const index = lines.findIndex((line) => line.startsWith(key + ":"));
      if (index >= 0) lines[index] = key + ": " + value;
      else lines.push(key + ": " + value);
      editor.value = match[1] + lines.join("\\n") + match[3] + source.slice(match[0].length);
      editor.focus();
    }

    function chooseSchoolLogo(value, label) {
      setFrontmatterField("schoolLogo", value);
      message.className = "";
      message.textContent = "已选择学校 Logo " + label;
    }

    function renderSchoolLogoLibrary() {
      for (const button of builtinSchoolLogoList.querySelectorAll(".builtinSchoolLogoChip")) {
        if (button.dataset.bound === "true") continue;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          chooseSchoolLogo("<school-logo>" + button.dataset.logoId + "</school-logo>", button.textContent.trim());
        });
      }

      customSchoolLogoList.innerHTML = "";
      for (const [key, file] of Object.entries(currentConfig.schoolLogos || {})) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "logoChip";
        button.textContent = key;
        button.title = file;
        button.addEventListener("click", () => chooseSchoolLogo("<school-logo>" + key + "</school-logo>", key));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "logoChip logoRemove";
        remove.textContent = "×";
        remove.title = "删除 " + key;
        remove.addEventListener("click", () => {
          delete currentConfig.schoolLogos[key];
          renderSchoolLogoLibrary();
          saveConfigToServer();
        });
        customSchoolLogoList.append(button, remove);
      }
    }

    function renderLogoLibrary() {
      for (const button of builtinLogoList.querySelectorAll(".builtinLogoChip")) {
        if (button.dataset.bound === "true") continue;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          insertAtCursor("<logo>" + button.dataset.logoId + "</logo>");
        });
      }

      customLogoList.innerHTML = "";
      for (const [key, file] of Object.entries(currentConfig.logos || {})) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "logoChip";
        button.textContent = key;
        button.title = file;
        button.addEventListener("click", () => insertAtCursor("<logo>" + key + "</logo>"));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "logoChip logoRemove";
        remove.textContent = "×";
        remove.title = "删除 " + key;
        remove.addEventListener("click", () => {
          delete currentConfig.logos[key];
          renderLogoLibrary();
          saveConfigToServer();
        });
        customLogoList.append(button, remove);
      }
    }

    function renderColorPresetLibrary() {
      const labels = { gray: "灰色", pink: "粉色", blue: "蓝色" };
      const paths = { gray: "theme.colors.omrColorGrayBg", pink: "theme.colors.omrColorPinkBg", blue: "theme.colors.omrColorBlueBg" };
      for (const button of colorPresetList.querySelectorAll(".colorPresetChip")) {
        const color = button.dataset.color;
        button.style.background = "rgb(" + (getPath(currentConfig, paths[color]) || "243,244,246") + ")";
        button.title = '<color="' + color + '">...</color>';
        if (button.dataset.bound === "true") continue;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          const selected = editor.value.slice(editor.selectionStart, editor.selectionEnd) || "请在此填写经历标题";
          insertAtCursor('<color="' + color + '">' + selected + "</color>");
          message.className = "";
          message.textContent = "已插入 " + labels[color] + "彩色条标签";
        });
      }
    }

    function collectStyleConfig() {
      const config = { theme: { colors: {}, lengths: {}, fonts: {}, sizes: {} }, markdown: {} };
      for (const grid of document.querySelectorAll(".categoryGrid")) {
        for (const el of grid.querySelectorAll("input, select")) {
          const path = el.dataset.path;
          if (!path) continue;
          if (path.startsWith("theme.colors.")) {
            const rgb = (el.type === "color" ? el.dataset.rgb : el.value).trim();
            if (rgb) setPath(config, path, rgb);
          } else {
            const value = el.value.trim();
            if (value) {
              const unit = getUnit(path);
              if (unit && !isNaN(parseFloat(value))) {
                setPath(config, path, value + unit);
              } else {
                setPath(config, path, value);
              }
            }
          }
        }
      }
      return config;
    }

    function applyQuickConfig() {
      setPath(currentConfig, "theme.options.omrHeaderAlign", quickHeaderAlign.value);
      setPath(currentConfig, "theme.options.sectionStyle", quickSectionStyle.value);
      setPath(currentConfig, "theme.fonts.omrCJKMainFont", quickFont.value);
      setPath(currentConfig, "theme.fonts.omrBodyFont", quickEnFont.value);
      setPath(currentConfig, "theme.sizes.omrBodyFontSize", quickBodySize.value + "pt");
      setPath(currentConfig, "theme.sizes.omrSectionFontSize", quickSectionSize.value + "pt");
      setPath(currentConfig, "theme.sizes.omrEntryFontSize", quickEntrySize.value + "pt");
      setPath(currentConfig, "theme.sizes.omrBodyLineHeight", quickLine.value + "pt");
      setPath(currentConfig, "theme.sizes.omrSectionLineHeight", quickSectionLine.value + "pt");
      setPath(currentConfig, "theme.sizes.omrNameFontSize", quickNameSize.value + "pt");
      setPath(currentConfig, "theme.sizes.omrNameLineHeight", quickNameLine.value + "pt");
      setPath(currentConfig, "theme.sizes.omrContactFontSize", quickContactSize.value + "pt");
      setPath(currentConfig, "theme.sizes.omrContactLineHeight", quickContactLine.value + "pt");
      setPath(currentConfig, "theme.lengths.omrNameMarginTop", quickNameMarginTop.value + "em");
      setPath(currentConfig, "theme.lengths.omrNameMarginBottom", quickNameMarginBottom.value + "em");
      setPath(currentConfig, "theme.lengths.omrContactMarginTop", quickContactMarginTop.value + "em");
      setPath(currentConfig, "theme.lengths.omrContactMarginBottom", quickContactMarginBottom.value + "em");
      setPath(currentConfig, "theme.lengths.omrPageMarginTop", quickMarginTop.value + "mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginBottom", quickMarginBottom.value + "mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginLeft", quickMarginLeft.value + "mm");
      setPath(currentConfig, "theme.lengths.omrPageMarginRight", quickMarginRight.value + "mm");
      setPath(currentConfig, "theme.lengths.omrDividerGap", quickDividerGap.value + "em");
      setPath(currentConfig, "theme.lengths.omrPhotoHeight", quickPhoto.value + "cm");
      setPath(currentConfig, "theme.lengths.omrLogoHeight", quickLogo.value + "cm");
      setPath(currentConfig, "theme.lengths.omrInlineLogoHeight", quickInlineLogo.value + "em");
      setPath(currentConfig, "theme.lengths.omrLogoMarginTop", quickLogoMarginTop.value + "mm");
      setPath(currentConfig, "theme.lengths.omrLogoMarginBottom", quickLogoMarginBottom.value + "mm");
      setPath(currentConfig, "theme.lengths.omrPhotoRightInset", quickPhotoInset.value + "mm");
      renderCategoryFields();
      saveConfigToServer();
    }

    async function saveStyleConfig() {
      saveStyle.disabled = true;
      message.className = "";
      message.textContent = "Saving style...";
      // Sync alignment tags in Markdown
      for (const t of ["center","left","right"]) {
        const oldOpen = origAlignTags[t + "Open"];
        const oldClose = origAlignTags[t + "Close"];
        const newOpen = getPath(currentConfig, "markdown." + t + "Open");
        const newClose = getPath(currentConfig, "markdown." + t + "Close");
        if (oldOpen && oldClose && (oldOpen !== newOpen || oldClose !== newClose)) {
          editor.value = editor.value.split(oldOpen).join(newOpen).split(oldClose).join(newClose);
        }
      }
      try {
        const response = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: currentConfig })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Style save failed.");
        currentConfig = data.config;
        captureAlignTags();
        renderCategoryFields();
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

    async function exportCurrentConfigFile() {
      await flushConfigToServer();
      const blob = new Blob([JSON.stringify(currentConfig, null, 2) + "\\n"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "omr.config.json";
      anchor.click();
      URL.revokeObjectURL(url);
      message.className = "";
      message.textContent = "已导出当前配置";
    }

    async function importCurrentConfigFile(file) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await savePromise.catch(() => {});
      const config = JSON.parse(await file.text());
      const response = await fetch("/api/import-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "配置导入失败。");
      currentConfig = data.config;
      currentConfigPath = data.path || currentConfigPath;
      renderCategoryFields();
      renderQuickControls();
      renderLogoLibrary();
      renderSchoolLogoLibrary();
      captureAlignTags();
      message.className = "";
      message.textContent = "已导入并替换 " + currentConfigPath;
    }

    async function exportSources() {
      exportSource.disabled = true;
      message.className = "";
      message.textContent = "正在导出源码...";
      try {
        const response = await fetch("/api/export-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: editor.value })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "源码导出失败。");
        message.textContent = "已导出源码包 " + data.path;
      } catch (error) {
        message.className = "error";
        message.textContent = "源码导出失败";
        errorText.textContent = error.message || String(error);
        errorDialog.showModal();
      } finally {
        exportSource.disabled = false;
      }
    }

    async function exportHtmlPdfFile() {
      exportHtmlPdf.disabled = true;
      message.className = "";
      message.textContent = "正在导出 HTML PDF...";
      try {
        const response = await fetch("/api/html-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: editor.value })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "HTML PDF 导出失败。");
        showPreview(data.pdfUrl, "HTML PDF 预览");
        message.textContent = "已导出 HTML PDF " + data.pdf;
      } catch (error) {
        message.className = "error";
        message.textContent = "HTML PDF 导出失败";
        errorText.textContent = error.message || String(error);
        errorDialog.showModal();
      } finally {
        exportHtmlPdf.disabled = false;
      }
    }

    closeError.addEventListener("click", () => errorDialog.close());
    closeStyle.addEventListener("click", () => styleDialog.close());
    styleButton.addEventListener("click", () => { captureAlignTags(); styleDialog.showModal(); });
    exportCurrentConfig.addEventListener("click", () => exportCurrentConfigFile().catch((error) => {
      message.className = "error";
      message.textContent = error.message || "配置导出失败";
    }));
    importCurrentConfig.addEventListener("click", () => configImportFile.click());
    configImportFile.addEventListener("change", async () => {
      const file = configImportFile.files && configImportFile.files[0];
      if (!file) return;
      try {
        await importCurrentConfigFile(file);
      } catch (error) {
        message.className = "error";
        message.textContent = "配置导入失败";
        errorText.textContent = error.message || String(error);
        errorDialog.showModal();
      } finally {
        configImportFile.value = "";
      }
    });
    quickHeaderAlign.addEventListener("change", applyQuickConfig);
    quickSectionStyle.addEventListener("change", applyQuickConfig);
    quickFont.addEventListener("change", applyQuickConfig);
    quickEnFont.addEventListener("change", applyQuickConfig);
    quickBodySize.addEventListener("input", applyQuickConfig);
    quickSectionSize.addEventListener("input", applyQuickConfig);
    quickEntrySize.addEventListener("input", applyQuickConfig);
    quickLine.addEventListener("input", applyQuickConfig);
    quickSectionLine.addEventListener("input", applyQuickConfig);
    quickNameSize.addEventListener("input", applyQuickConfig);
    quickNameLine.addEventListener("input", applyQuickConfig);
    quickContactSize.addEventListener("input", applyQuickConfig);
    quickContactLine.addEventListener("input", applyQuickConfig);
    quickNameMarginTop.addEventListener("input", applyQuickConfig);
    quickNameMarginBottom.addEventListener("input", applyQuickConfig);
    quickContactMarginTop.addEventListener("input", applyQuickConfig);
    quickContactMarginBottom.addEventListener("input", applyQuickConfig);
    quickMarginTop.addEventListener("input", applyQuickConfig);
    quickMarginBottom.addEventListener("input", applyQuickConfig);
    quickMarginLeft.addEventListener("input", applyQuickConfig);
    quickMarginRight.addEventListener("input", applyQuickConfig);
    function renderSpacingInputs() {
      const level = spacingLevel.value;
      quickSpacingBefore.value = extractNumber(getPath(currentConfig, "theme.lengths.omr" + (level === "section" ? "Section" : "Entry") + "Before"));
      quickSpacingAfter.value = extractNumber(getPath(currentConfig, "theme.lengths.omr" + (level === "section" ? "Section" : "Entry") + "After"));
    }
    function saveSpacing() {
      const level = spacingLevel.value;
      const prefix = "theme.lengths.omr" + (level === "section" ? "Section" : "Entry");
      setPath(currentConfig, prefix + "Before", quickSpacingBefore.value + "em");
      setPath(currentConfig, prefix + "After", quickSpacingAfter.value + "em");
      saveConfigToServer();
    }
    spacingLevel.addEventListener("change", () => { renderSpacingInputs(); });
    quickSpacingBefore.addEventListener("input", saveSpacing);
    quickSpacingAfter.addEventListener("input", saveSpacing);
    quickDividerGap.addEventListener("input", applyQuickConfig);
    quickMarginPreset.addEventListener("change", () => {
      applyMarginPreset(quickMarginPreset.value);
    });
    quickPhoto.addEventListener("input", applyQuickConfig);
    quickLogo.addEventListener("input", applyQuickConfig);
    quickInlineLogo.addEventListener("input", applyQuickConfig);
    quickLogoMarginTop.addEventListener("input", applyQuickConfig);
    quickLogoMarginBottom.addEventListener("input", applyQuickConfig);
    quickPhotoInset.addEventListener("input", applyQuickConfig);
    addCustomLogo.addEventListener("click", () => {
      const key = customLogoKey.value.trim().toLowerCase();
      const file = customLogoPath.value.trim();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key) || !file) {
        message.className = "error";
        message.textContent = "Logo key 仅支持小写字母、数字和连字符，且图片路径不能为空";
        return;
      }
      currentConfig.logos = currentConfig.logos || {};
      currentConfig.logos[key] = file;
      customLogoKey.value = "";
      customLogoPath.value = "";
      renderLogoLibrary();
      saveConfigToServer();
    });
    addCustomSchoolLogo.addEventListener("click", () => {
      const key = customSchoolLogoKey.value.trim().toLowerCase();
      const file = customSchoolLogoPath.value.trim();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key) || !file) {
        message.className = "error";
        message.textContent = "学校 Logo key 仅支持小写字母、数字和连字符，且图片路径不能为空";
        return;
      }
      currentConfig.schoolLogos = currentConfig.schoolLogos || {};
      currentConfig.schoolLogos[key] = file;
      customSchoolLogoKey.value = "";
      customSchoolLogoPath.value = "";
      renderSchoolLogoLibrary();
      saveConfigToServer();
    });
    saveStyle.addEventListener("click", saveStyleConfig);
    let saveTimer = null;
    let savePromise = Promise.resolve();
    async function persistConfigToServer(config, notify = true) {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Style save failed.");
      currentConfig = data.config;
      if (notify) {
        message.className = "";
        message.textContent = "已保存 " + new Date().toLocaleTimeString();
      }
      return data;
    }
    function enqueueConfigSave(notify = true) {
      const snapshot = JSON.parse(JSON.stringify(currentConfig));
      savePromise = savePromise.catch(() => {}).then(() => persistConfigToServer(snapshot, notify));
      return savePromise;
    }
    function saveConfigToServer() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        enqueueConfigSave().catch(() => {});
      }, 300);
    }
    async function flushConfigToServer() {
      clearTimeout(saveTimer);
      saveTimer = null;
      await enqueueConfigSave(false);
    }
    customColor.addEventListener("input", () => {
      const rgb = hexToRgb(customColor.value);
      const tagBg = calcTagBg(rgb);
      setPath(currentConfig, "theme.colors.omrTagText", rgb);
      setPath(currentConfig, "theme.colors.omrLinkColor", rgb);
      setPath(currentConfig, "theme.colors.omrTagBg", tagBg);
      setPath(currentConfig, "theme.colors.omrSectionBg", rgb);
      renderCategoryFields();
      renderQuickControls();
      saveConfigToServer();
    });
    function applyColorPick(picker, configPath) {
      setPath(currentConfig, configPath, hexToRgb(picker.value));
      renderCategoryFields();
      renderQuickControls();
      saveConfigToServer();
    }
    quickTagBg.addEventListener("input", () => applyColorPick(quickTagBg, "theme.colors.omrTagBg"));
    quickTagText.addEventListener("input", () => applyColorPick(quickTagText, "theme.colors.omrTagText"));
    quickSectionBg.addEventListener("input", () => applyColorPick(quickSectionBg, "theme.colors.omrSectionBg"));
    quickLinkColor.addEventListener("input", () => applyColorPick(quickLinkColor, "theme.colors.omrLinkColor"));
    quickColorGrayBg.addEventListener("input", () => applyColorPick(quickColorGrayBg, "theme.colors.omrColorGrayBg"));
    quickColorPinkBg.addEventListener("input", () => applyColorPick(quickColorPinkBg, "theme.colors.omrColorPinkBg"));
    quickColorBlueBg.addEventListener("input", () => applyColorPick(quickColorBlueBg, "theme.colors.omrColorBlueBg"));
    let origAlignTags = {};
    function captureAlignTags() {
      for (const t of ["center","left","right"]) {
        origAlignTags[t + "Open"] = getPath(currentConfig, "markdown." + t + "Open");
        origAlignTags[t + "Close"] = getPath(currentConfig, "markdown." + t + "Close");
      }
    }
    function renderAlignControls() {
      const type = alignTypeSelect.value;
      alignOpen.value = getPath(currentConfig, "markdown." + type + "Open");
      alignClose.value = getPath(currentConfig, "markdown." + type + "Close");
    }
    function saveAlignControls() {
      const type = alignTypeSelect.value;
      setPath(currentConfig, "markdown." + type + "Open", alignOpen.value);
      setPath(currentConfig, "markdown." + type + "Close", alignClose.value);
    }
    alignTypeSelect.addEventListener("change", renderAlignControls);
    alignOpen.addEventListener("input", saveAlignControls);
    alignClose.addEventListener("input", saveAlignControls);
    resetStyle.addEventListener("click", loadState);
    engineSelect.addEventListener("change", syncEngineActions);
    renderButton.addEventListener("click", render);
    exportSource.addEventListener("click", exportSources);
    exportHtmlPdf.addEventListener("click", exportHtmlPdfFile);
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

function splitPathList(value) {
  return String(value || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniquePathList(items) {
  const seen = new Set();
  const result = [];
  for (const item of items.filter(Boolean)) {
    const key = process.platform === "win32" ? item.toLowerCase() : item;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function expandWindowsEnvVars(value, env = process.env) {
  return String(value || "").replace(/%([^%]+)%/g, (match, name) => env[name] || match);
}

let cachedWindowsRegistryPaths;

function readWindowsRegistryPathValues(env = process.env) {
  if (process.platform !== "win32") return [];
  if (cachedWindowsRegistryPaths) return cachedWindowsRegistryPaths;

  const queries = [
    ["HKCU\\Environment", "Path"],
    ["HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment", "Path"]
  ];
  const values = [];
  for (const [key, valueName] of queries) {
    const result = spawnSync("reg.exe", ["query", key, "/v", valueName], { encoding: "utf8" });
    if (result.status !== 0) continue;
    const line = String(result.stdout || "").split(/\r?\n/).find((item) => new RegExp(`^\\s*${valueName}\\s+REG_`, "i").test(item));
    if (!line) continue;
    const match = line.match(/^\s*\S+\s+REG_\S+\s+(.+)$/);
    if (match) values.push(expandWindowsEnvVars(match[1].trim(), env));
  }
  cachedWindowsRegistryPaths = values.flatMap(splitPathList);
  return cachedWindowsRegistryPaths;
}

function existingCommonWindowsTexPaths(env = process.env) {
  if (process.platform !== "win32") return [];
  const programFiles = env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = env.LOCALAPPDATA || "";
  const systemDrive = env.SystemDrive || "C:";
  const texLiveRoot = path.join(systemDrive, "texlive");
  const texLiveBins = fs.existsSync(texLiveRoot)
    ? fs.readdirSync(texLiveRoot)
        .map((name) => path.join(texLiveRoot, name, "bin", "windows"))
    : [];
  const candidates = [
    path.join(programFiles, "MiKTeX", "miktex", "bin", "x64"),
    path.join(programFilesX86, "MiKTeX", "miktex", "bin", "x64"),
    localAppData ? path.join(localAppData, "Programs", "MiKTeX", "miktex", "bin", "x64") : "",
    localAppData ? path.join(localAppData, "MiKTeX", "miktex", "bin", "x64") : "",
    ...texLiveBins,
    "C:\\Strawberry\\c\\bin",
    "C:\\Strawberry\\perl\\site\\bin",
    "C:\\Strawberry\\perl\\bin"
  ];
  return candidates.filter((item) => item && fs.existsSync(item));
}

function findHtmlPdfBrowser(env = process.env) {
  const explicit = env.OMR_HTML_PDF_BROWSER || env.CHROME_PATH || env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;

  if (process.platform === "darwin") {
    const appBins = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ];
    const foundApp = appBins.find((item) => fs.existsSync(item));
    if (foundApp) return foundApp;
  }

  if (process.platform === "win32") {
    const localAppData = env.LOCALAPPDATA || "";
    const programFiles = env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const candidates = [
      localAppData ? path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe") : "",
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe")
    ];
    const found = candidates.find((item) => item && fs.existsSync(item));
    if (found) return found;
  }

  return findCommand("google-chrome", env)
    || findCommand("google-chrome-stable", env)
    || findCommand("microsoft-edge", env)
    || findCommand("msedge", env)
    || findCommand("chromium", env)
    || findCommand("chromium-browser", env)
    || findCommand("chrome", env);
}

function withTexPath(env, texInputs = []) {
  const current = env.PATH || "";
  const explicitTexPath = splitPathList(env.OMR_TEX_PATH || env.OH_MY_RESUME_TEX_PATH);
  const additions = process.platform === "win32"
    ? [
        ...explicitTexPath,
        ...readWindowsRegistryPathValues(env),
        ...existingCommonWindowsTexPaths(env)
      ]
    : [
        ...explicitTexPath,
        "/Library/TeX/texbin"
      ];
  const texmfVar = env.TEXMFVAR || path.join(os.tmpdir(), "oh-my-resume-texmf-var");
  fs.mkdirSync(texmfVar, { recursive: true });
  const existingTexInputs = env.TEXINPUTS || "";
  const resolvedTexInputs = texInputs.map((item) => path.resolve(item));
  return {
    ...env,
    PATH: uniquePathList([...additions, ...splitPathList(current)]).join(path.delimiter),
    TEXINPUTS: [...resolvedTexInputs, existingTexInputs].join(path.delimiter),
    TEXMFVAR: texmfVar
  };
}

function spawnCommandSync(command, args, options = {}) {
  const needsShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  return spawnSync(command, args, {
    ...options,
    shell: needsShell || options.shell
  });
}
function findCommand(command, env = process.env) {
  const paths = String(env.PATH || "").split(path.delimiter);
  const exts = process.platform === "win32"
    ? ["", ...String(env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean)]
    : [""];
  for (const dir of paths) {
    for (const ext of exts) {
      const candidate = path.join(dir, command + ext);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function commandExists(command) {
  const env = withTexPath(process.env);
  const bin = findCommand(command, env);
  if (!bin) return false;
  const result = spawnCommandSync(bin, ["--version"], { encoding: "utf8", env });
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
  if (command === "html") return htmlCommand(args);
  if (command === "html-pdf") return htmlPdfCommand(args);
  if (command === "pdf") return pdfCommand(args);
  if (command === "export") return exportSourcePackage(args);
  if (command === "debug") return debugCommand(args);
  if (command === "watch") return watchCommand(args);
  if (command === "doctor") return doctorCommand();

  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  withTexPath,
  findCommand,
  findHtmlPdfBrowser,
  commandExists,
  spawnCommandSync
};
