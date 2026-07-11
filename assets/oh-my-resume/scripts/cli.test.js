const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const cli = require("./cli");
const { buildHtmlResume, parseMarkdown, renderHtmlDocument } = require("./build");

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

async function testLocalPresetsOnlyListCurrentDirectoryJson() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omr-preset-test-"));
  fs.mkdirSync(path.join(tempDir, "omr.styles"));
  fs.writeFileSync(path.join(tempDir, "omr.styles", "comfort.json"), JSON.stringify({ theme: { sizes: { omrBodyFontSize: "11pt" } } }));
  fs.writeFileSync(path.join(tempDir, "omr.styles", "notes.txt"), "ignore");
  const presets = cli.listStylePresets(tempDir);
  assert.deepStrictEqual(presets, [{
    id: "local:comfort.json",
    label: "comfort",
    path: path.join("omr.styles", "comfort.json")
  }]);
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
      sizes: { omrBodyFontSize: "11pt" },
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
  assert.match(html, /data:image\/jpeg;base64/);
  assert.match(html, /@media print/);
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
  await testLocalPresetsOnlyListCurrentDirectoryJson();
  await testHtmlRendererBuildsStandalonePreview();
  await testNestedBulletsPreserveMarkdownIndentation();
  await testHtmlPdfBrowserCanUseExplicitPath();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
