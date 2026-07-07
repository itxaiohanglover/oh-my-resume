const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const cli = require("./cli");

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
    "### Debug Render <time>2026</time>",
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
async function main() {
  await testWithTexPathUsesExplicitExtraPath();
  await testDebugServerSurvivesLongRender();
  await testWindowsInstallScriptsAreWired();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
