const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawn } = require("child_process");

const cli = require("./cli");
const {
  buildHtmlResume,
  buildResume,
  parseMarkdown,
  readBuiltInSchoolLogos,
  renderDocument,
  renderHtmlDocument,
  resolveSchoolLogo
} = require("./build");

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const body = options.body ? Buffer.from(options.body) : null;
    const request = http.request(url, {
      method: options.method || "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json", "Content-Length": body.length } : {})
      },
      timeout: options.timeout || 5000
    }, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        resolve({ statusCode: response.statusCode, body: data });
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error(`Request timed out: ${url}`));
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await requestJson(url, { timeout: 1000 });
      if (response.statusCode === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError || new Error("Debug server did not become ready.");
}

function makeFakeLatexmk(dir) {
  fs.mkdirSync(dir, { recursive: true });
  if (process.platform === "win32") {
    fs.writeFileSync(path.join(dir, "latexmk.cmd"), "@echo off\r\npowershell -NoProfile -Command Start-Sleep -Seconds 14\r\nexit /b 0\r\n");
    return;
  }
  const file = path.join(dir, "latexmk");
  fs.writeFileSync(file, "#!/bin/sh\nsleep 14\nexit 0\n");
  fs.chmodSync(file, 0o755);
}

async function testWithTexPathUsesExplicitExtraPath() {
  assert.strictEqual(typeof cli.withTexPath, "function");
  const env = cli.withTexPath({ PATH: "base-path", OMR_TEX_PATH: ["extra-a", "extra-b"].join(path.delimiter) });
  const paths = env.PATH.split(path.delimiter);
  assert.deepStrictEqual(paths.slice(0, 2), ["extra-a", "extra-b"]);
}

async function testDebugServerSurvivesLongRender() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-debug-test-"));
  const binDir = path.join(tempDir, "bin");
  makeFakeLatexmk(binDir);
  fs.writeFileSync(path.join(tempDir, "resume.md"), [
    "---",
    "name: Test User",
    "theme: classic",
    "---",
    "",
    "## Experience",
    "",
    "### Debug Render <right>2026</right>",
    "",
    "- Keeps the server alive after rendering."
  ].join("\n"));
  fs.writeFileSync(path.join(tempDir, "omr.config.json"), JSON.stringify({ obsolete: true }));

  const port = 57231;
  const child = spawn(process.execPath, [
    path.join(__dirname, "cli.js"),
    "debug",
    "resume.md",
    "--no-open",
    "--port",
    String(port)
  ], {
    cwd: tempDir,
    env: {
      ...process.env,
      PATH: [binDir, process.env.PATH || ""].filter(Boolean).join(path.delimiter),
      OMR_TEX_PATH: binDir
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/api/state`);
    const page = await requestJson(`http://127.0.0.1:${port}/`);
    assert.strictEqual(page.statusCode, 200);
    const scripts = [...page.body.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length, "debug page should include an inline script");
    assert.doesNotThrow(() => new vm.Script(scripts.at(-1)[1]));
    assert.strictEqual((page.body.match(/class="logoChip builtinLogoChip"/g) || []).length, 21);
    assert.match(page.body, /data-logo-id="china-mobile"/);
    assert.match(page.body, /data-logo-id="tongyi-lab"/);
    assert.match(page.body, /data-logo-id="deepseek"/);
    assert.match(page.body, /data-logo-id="trae"/);
    assert.match(page.body, /data-logo-id="github"/);
    assert.match(page.body, /id="quickDividerGap"/);
    assert.match(page.body, /id="quickColorGrayBg"/);
    assert.match(page.body, /id="quickColorPinkBg"/);
    assert.match(page.body, /id="quickColorBlueBg"/);
    assert.match(page.body, /id="colorPresetList"/);
    assert.match(page.body, /data-color="gray"/);
    assert.match(page.body, /data-color="pink"/);
    assert.match(page.body, /data-color="blue"/);
    assert.match(page.body, /\*\*\* 分割线上下间距（em）/);
    assert.match(page.body, /id="quickNameSize"/);
    assert.match(page.body, /id="quickContactSize"/);
    assert.match(page.body, /id="quickNameMarginTop"/);
    assert.match(page.body, /id="quickNameMarginBottom"/);
    assert.match(page.body, /id="quickContactMarginTop"/);
    assert.match(page.body, /id="quickContactMarginBottom"/);
    assert.match(page.body, /id="quickLogoMarginTop"/);
    assert.match(page.body, /id="quickLogoMarginBottom"/);
    assert.match(page.body, /id="exportCurrentConfig"/);
    assert.match(page.body, /id="importCurrentConfig"/);
    assert.match(page.body, /data-logo-id="uestc"/);
    assert.match(page.body, /data-logo-id="peking-university"/);
    assert.match(page.body, /data-logo-id="southeast-university"/);
    assert.match(page.body, /data-logo-id="northwestern-polytechnical-university"/);
    assert.match(page.body, /builtin-logo\/alibaba\?v=FF6A00/);
    const builtInLogo = await requestJson(`http://127.0.0.1:${port}/builtin-logo/china-mobile?v=0086D0%2C8EC320`);
    assert.strictEqual(builtInLogo.statusCode, 200);
    const builtInSchoolLogo = await requestJson(`http://127.0.0.1:${port}/builtin-school-logo/uestc`);
    assert.strictEqual(builtInSchoolLogo.statusCode, 200);
    const importedConfig = {
      input: "resume.md",
      theme: { sizes: { omrBodyFontSize: "12pt" } },
      schoolLogos: { campus: "campus.png" }
    };
    const imported = await requestJson(`http://127.0.0.1:${port}/api/import-config`, {
      method: "POST",
      body: JSON.stringify({ config: importedConfig })
    });
    assert.strictEqual(imported.statusCode, 200, imported.body);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempDir, "omr.config.json"), "utf8")), importedConfig);
    await requestJson(`http://127.0.0.1:${port}/api/ping`, { method: "POST" });
    const render = await requestJson(`http://127.0.0.1:${port}/api/render`, {
      method: "POST",
      body: JSON.stringify({ markdown: fs.readFileSync(path.join(tempDir, "resume.md"), "utf8") }),
      timeout: 25000
    });
    assert.strictEqual(render.statusCode, 200, render.body);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const ping = await requestJson(`http://127.0.0.1:${port}/api/ping`, { method: "POST", timeout: 3000 });
    assert.strictEqual(ping.statusCode, 200);
  } finally {
    if (!child.killed) child.kill();
  }
}

async function testWindowsInstallScriptsAreWired() {
  const packageRoot = path.resolve(__dirname, "..");
  const batPath = path.join(packageRoot, "install.bat");
  const psPath = path.join(packageRoot, "scripts", "install.ps1");
  assert.ok(fs.existsSync(batPath), "install.bat should be available for Windows first-run setup");
  assert.ok(fs.existsSync(psPath), "scripts/install.ps1 should contain the actual Windows setup logic");

  const bat = fs.readFileSync(batPath, "utf8");
  const ps = fs.readFileSync(psPath, "utf8");
  assert.match(bat, /install\.ps1/i);
  assert.match(bat, /-PersistUserEnv/i);
  assert.match(ps, /OMR_TEX_PATH/);
  assert.match(ps, /scripts\\cli\.js\s+doctor/i);
  assert.match(ps, /VerifyPdf/);
}

async function testHtmlRendererBuildsStandalonePreview() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-html-test-"));
  fs.writeFileSync(path.join(tempDir, "avatar.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  fs.writeFileSync(path.join(tempDir, "resume.md"), [
    "---",
    "name: Test User",
    "avatar: avatar.jpg",
    "contacts:",
    "  - 邮箱：[test@example.com](mailto:test@example.com)",
    "---",
    "",
    "## Experience",
    "",
    "### Project`AI` <right>2026</right>",
    "",
    "- Built **fast** preview."
  ].join("\n"));
  fs.writeFileSync(path.join(tempDir, "omr.config.json"), JSON.stringify({
    theme: {
      lengths: {
        omrNameMarginTop: "0.2em",
        omrNameMarginBottom: "0.3em",
        omrContactMarginTop: "0.1em",
        omrContactMarginBottom: "0.15em",
        omrLogoMarginTop: "1mm",
        omrLogoMarginBottom: "2mm"
      },
      sizes: {
        omrBodyFontSize: "11pt",
        omrNameFontSize: "18pt",
        omrNameLineHeight: "21pt",
        omrContactFontSize: "11.4pt",
        omrContactLineHeight: "15pt"
      },
      options: { sectionStyle: "minimal" }
    }
  }));
  const result = buildHtmlResume({
    cwd: tempDir,
    input: "resume.md",
    output: "build/resume.html",
    config: "omr.config.json"
  });
  const html = fs.readFileSync(result.output, "utf8");
  assert.match(html, /Test User/);
  assert.match(html, /<span class="tag">AI<\/span>/);
  assert.match(html, /<strong>fast<\/strong>/);
  assert.match(html, /sectionTitle section-minimal/);
  assert.match(html, /\.name \{[^}]*font-size: 18pt;[^}]*line-height: 21pt;/);
  assert.match(html, /\.contact \{[^}]*font-size: 11\.4pt;[^}]*line-height: 15pt;/);
  assert.match(html, /\.name \{ margin: 0\.2em 0 0\.3em;/);
  assert.match(html, /\.contactGroup \{ margin: 0\.1em 0 0\.15em;/);
  assert.match(html, /\.logoWrap \{[^}]*padding-top: 1mm;[^}]*padding-bottom: 2mm;/);
  assert.match(html, /header \{ position: relative; margin-bottom:/);
  assert.doesNotMatch(html, /header \{[^}]*min-height:/);
  assert.match(html, /\.avatarWrap \{[^}]*position: absolute;[^}]*top: 50%;[^}]*translateY\(-50%\);/);
  assert.match(html, /data:image\/jpeg;base64/);
  assert.match(html, /@media print/);

  const headerComponent = fs.readFileSync(path.join(__dirname, "..", "src", "components", "header.tex"), "utf8");
  assert.match(headerComponent, /\\smash\{\\llap\{/);
  assert.match(headerComponent, /\\smash\{\\rlap\{/);
  assert.doesNotMatch(headerComponent, /\\begin\{minipage\}\[c\]\[\\omrPhotoHeight\]/);
}

async function testNestedBulletsPreserveMarkdownIndentation() {
  const sections = parseMarkdown([
    "## Experience",
    "",
    "### Project <time>2026</time>",
    "- Top level",
    "  - Second level",
    "    - Third level"
  ].join("\n"));
  const bullets = sections[0].blocks[0].bullets;
  assert.deepStrictEqual(bullets, [
    { type: "bullet", level: 1, text: "Top level" },
    { type: "bullet", level: 2, text: "Second level" },
    { type: "bullet", level: 3, text: "Third level" }
  ]);
  const html = renderHtmlDocument({ name: "Nested" }, sections, { config: {} });
  assert.match(html, /<li>Top level\n<ul>/);
  assert.match(html, /<li>Second level\n<ul>/);
  assert.match(html, /<li>Third level<\/li>/);
}

async function testParagraphLinksAreNotParsedAsFields() {
  const paragraph = "针对 Repo-level 代码生成，构建 **[自进化 Agent](https://github.com/itxaiohanglover/deep-code-research)**，**首次提出**执行反馈驱动的 Skill 蒸馏。";
  const sections = parseMarkdown([
    "## Experience",
    "",
    "### Project <right>2026</right>",
    "职责：Agent 系统研发",
    paragraph
  ].join("\n"));
  const entry = sections[0].blocks[0];
  assert.deepStrictEqual(entry.fields, [{ label: "职责", value: "Agent 系统研发" }]);
  assert.deepStrictEqual(entry.paragraphs, [paragraph]);

  const html = renderHtmlDocument({ name: "Links" }, sections, { config: {} });
  assert.match(html, /<strong><a href="https:\/\/github\.com\/itxaiohanglover\/deep-code-research">自进化 Agent<\/a><\/strong>/);
  assert.match(html, /<strong>首次提出<\/strong>/);
}

async function testAsteriskDividerSeparatesEntries() {
  const sections = parseMarkdown([
    "## Experience",
    "",
    "### Alibaba <right>2026</right>",
    "Built an Agent platform.",
    "- Runtime infrastructure",
    "***",
    "### ByteDance <right>2026</right>",
    "Built an OPC Agent."
  ].join("\n"));
  assert.deepStrictEqual(sections[0].blocks.map((block) => block.type), ["entry", "divider", "entry"]);

  const theme = { lengths: { omrDividerGap: "0.75em" } };
  const html = renderHtmlDocument({ name: "Divider" }, sections, { config: { theme } });
  assert.match(html, /<\/article>\n<hr class="divider">\n<article class="entry">/);
  assert.match(html, /\.divider \{[^}]*margin: 0\.75em 0;/);
  const tex = renderDocument({ name: "Divider" }, sections, { themeOverrides: theme });
  assert.match(tex, /\\renewcommand\{\\omrDividerGap\}\{0\.75em\}/);
  assert.match(tex, /\\omrDivider/);
}

async function testColorEntryBarsSupportThreeConfigurableTones() {
  const sections = parseMarkdown([
    "## Experience",
    "",
    "### <color color=\"blue\">Blue entry <right>2026</right></color>",
    "### <color color=\"pink\">Pink entry <right>2025</right></color>",
    "### <color color='#f0f4ff'>Custom entry <right>2024</right></color>",
    "### <color color=\"blue\">Company <center>Role `Agent`</center><right>2026</right></color>"
  ].join("\n"));
  assert.deepStrictEqual(sections[0].blocks.map((entry) => entry.color), [
    { type: "named", value: "blue" }, { type: "named", value: "pink" }, { type: "rgb", value: "240,244,255" }, { type: "named", value: "blue" }
  ]);
  assert.deepStrictEqual(sections[0].blocks[3].center, { text: "Role", tags: ["Agent"] });

  const theme = { colors: { omrColorPinkBg: "250,230,235" } };
  const html = renderHtmlDocument({ name: "Colors" }, sections, { config: { theme } });
  assert.match(html, /class="entry colorEntry color-blue"/);
  assert.match(html, /class="entry colorEntry color-pink"/);
  assert.match(html, /class="entry colorEntry" style="background:rgb\(240,244,255\)"/);
  assert.match(html, /\.color-pink \{ background: rgb\(250,230,235\); \}/);

  const tex = renderDocument({ name: "Colors" }, sections, { themeOverrides: theme });
  assert.match(tex, /\\omrColoredDatedEntryFull\{blue\}/);
  assert.match(tex, /\\omrColoredDatedEntryFull\{pink\}/);
  assert.match(tex, /\\omrColoredDatedEntryFullRgb\{240,244,255\}/);
  assert.match(tex, /\\omrColoredDatedEntryFull\{blue\}\{Company\}\{\}\{Role~\\tagbox\{Agent\}\}\{\\tightdate\{2026\}\}/);
  assert.match(tex, /\\definecolor\{omrColorPinkBg\}\{RGB\}\{250,230,235\}/);
}

async function testInlineLogosRenderBuiltInAndCustomAssets() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-logo-test-"));
  fs.writeFileSync(path.join(tempDir, "company.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(path.join(tempDir, "resume.md"), [
    "---",
    "name: Logo User",
    "---",
    "",
    "## Experience",
    "",
    "### <logo>alibaba</logo> Alibaba <right>2026</right>",
    "",
    "- Built <logo>my-company</logo> platform.",
    "- Worked with <logo>china-mobile</logo> China Mobile.",
    "- AI brands: <logo>tongyi-lab</logo> <logo>pinduoduo</logo> <logo>xiaohongshu</logo> <logo>tencent</logo> <logo>kimi</logo> <logo>deepseek</logo> <logo>trae</logo> <logo>github</logo>.",
    "- Direct asset: <logo src=\"company.png\">Direct Company</logo>."
  ].join("\n"));
  fs.writeFileSync(path.join(tempDir, "omr.config.json"), JSON.stringify({
    logos: { "my-company": "company.png" },
    theme: {
      lengths: {
        omrInlineLogoHeight: "1.1em",
        omrLogoMarginTop: "1mm",
        omrLogoMarginBottom: "2mm"
      },
      sizes: { omrNameFontSize: "18pt", omrContactFontSize: "11.4pt" }
    }
  }));

  const htmlResult = buildHtmlResume({
    cwd: tempDir,
    input: "resume.md",
    output: "build/resume.html",
    config: "omr.config.json"
  });
  const html = fs.readFileSync(htmlResult.output, "utf8");
  assert.match(html, /class="inlineLogo"/);
  assert.match(html, /alt="阿里巴巴"/);
  assert.match(html, /alt="Direct Company"/);
  assert.match(html, /alt="中国移动"/);
  assert.match(html, /alt="通义实验室"/);
  assert.match(html, /alt="DeepSeek"/);
  assert.match(html, /height: 1\.1em/);
  assert.match(html, /data:image\/png;base64/);

  const texResult = buildResume({
    cwd: tempDir,
    input: "resume.md",
    output: "build/resume.tex",
    config: "omr.config.json"
  });
  const tex = fs.readFileSync(texResult.output, "utf8");
  assert.match(tex, /\\omrInlineLogo\{/);
  assert.match(tex, /alibaba\.png/);
  assert.match(tex, /company\.png/);
  assert.match(tex, /china-mobile\.png/);
  assert.match(tex, /tongyi-lab\.png/);
  assert.match(tex, /pinduoduo\.png/);
  assert.match(tex, /xiaohongshu\.png/);
  assert.match(tex, /tencent\.png/);
  assert.match(tex, /kimi\.png/);
  assert.match(tex, /deepseek\.png/);
  assert.match(tex, /trae\.png/);
  assert.match(tex, /github\.png/);
  assert.match(tex, /\\renewcommand\{\\omrInlineLogoHeight\}\{1\.1em\}/);
  assert.match(tex, /\\renewcommand\{\\omrLogoMarginTop\}\{1mm\}/);
  assert.match(tex, /\\renewcommand\{\\omrLogoMarginBottom\}\{2mm\}/);
  assert.match(tex, /\\renewcommand\{\\omrNameFontSize\}\{18pt\}/);
  assert.match(tex, /\\renewcommand\{\\omrContactFontSize\}\{11\.4pt\}/);
}

async function testSchoolLogosSupportPresetTagAndPaths() {
  const packageRoot = path.resolve(__dirname, "..");
  const builtIns = readBuiltInSchoolLogos(packageRoot);
  assert.deepStrictEqual(builtIns.map((item) => item.id), [
    "uestc",
    "peking-university",
    "southeast-university",
    "northwestern-polytechnical-university"
  ]);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-school-logo-test-"));
  const customFile = path.join(tempDir, "campus.png");
  fs.writeFileSync(customFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const input = path.join(tempDir, "resume.md");
  fs.writeFileSync(input, "---\nname: School User\n---\n");

  const preset = resolveSchoolLogo("<school-logo>uestc</school-logo>", { packageRoot, input });
  assert.strictEqual(path.basename(preset.file), "uestc.png");
  assert.strictEqual(preset.label, "电子科技大学");
  const direct = resolveSchoolLogo("campus.png", { packageRoot, input });
  assert.strictEqual(direct.file, customFile);
  const custom = resolveSchoolLogo("<school-logo>campus</school-logo>", {
    packageRoot,
    input,
    custom: { campus: "campus.png" }
  });
  assert.strictEqual(custom.file, customFile);

  const tex = renderDocument({ name: "School User", schoolLogo: "<school-logo>uestc</school-logo>" }, [], {
    packageRoot,
    input
  });
  assert.match(tex, /school-logos\/uestc\.png/);
  const html = renderHtmlDocument({ name: "School User", schoolLogo: "uestc" }, [], {
    packageRoot,
    input,
    config: {}
  });
  assert.match(html, /class="logoWrap"/);
  assert.match(html, /data:image\/png;base64/);
}

async function testHtmlPdfBrowserCanUseExplicitPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-browser-test-"));
  const browser = path.join(tempDir, process.platform === "win32" ? "chrome.cmd" : "chrome");
  fs.writeFileSync(browser, process.platform === "win32" ? "@echo off\r\nexit /b 0\r\n" : "#!/bin/sh\nexit 0\n");
  if (process.platform !== "win32") fs.chmodSync(browser, 0o755);
  assert.strictEqual(cli.findHtmlPdfBrowser({ OMR_HTML_PDF_BROWSER: browser }), browser);
}
async function main() {
  await testWithTexPathUsesExplicitExtraPath();
  await testDebugServerSurvivesLongRender();
  await testWindowsInstallScriptsAreWired();
  await testHtmlRendererBuildsStandalonePreview();
  await testNestedBulletsPreserveMarkdownIndentation();
  await testParagraphLinksAreNotParsedAsFields();
  await testAsteriskDividerSeparatesEntries();
  await testColorEntryBarsSupportThreeConfigurableTones();
  await testInlineLogosRenderBuiltInAndCustomAssets();
  await testSchoolLogosSupportPresetTagAndPaths();
  await testHtmlPdfBrowserCanUseExplicitPath();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
