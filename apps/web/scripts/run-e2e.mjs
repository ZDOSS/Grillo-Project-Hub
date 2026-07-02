import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const repoRoot = resolve(webRoot, "../..");
const viteBin = join(repoRoot, "node_modules", "vite", "bin", "vite.js");
const playwrightCli = join(repoRoot, "node_modules", "playwright", "cli.js");
const playwrightConfig = join(webRoot, "playwright.config.ts");
const host = "127.0.0.1";
const port = "5173";
const baseUrl = `http://${host}:${port}`;

let serverProcess;
let serverExit;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function waitForExit(child) {
  return new Promise((resolveExit) => {
    child.once("exit", (code, signal) => {
      resolveExit({ code, signal });
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    if (serverExit) {
      const reason = serverExit.signal ?? serverExit.code;
      throw new Error(`Vite exited before it was ready (${reason}).`);
    }

    try {
      const response = await fetch(baseUrl, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  const detail = lastError instanceof Error ? ` ${lastError.message}` : "";
  throw new Error(`Timed out waiting for ${baseUrl}.${detail}`);
}

async function stopServer() {
  if (!serverProcess || serverExit || shuttingDown) {
    return;
  }

  shuttingDown = true;
  const exited = waitForExit(serverProcess);
  serverProcess.kill("SIGTERM");

  const timeout = sleep(5_000).then(() => "timeout");
  const result = await Promise.race([exited, timeout]);

  if (result === "timeout" && !serverExit) {
    serverProcess.kill("SIGKILL");
    await exited;
  }
}

async function forwardSignal(signal) {
  await stopServer();
  process.kill(process.pid, signal);
}

process.once("SIGINT", () => {
  void forwardSignal("SIGINT");
});

process.once("SIGTERM", () => {
  void forwardSignal("SIGTERM");
});

try {
  serverProcess = spawn(
    process.execPath,
    [viteBin, "--host", host, "--port", port, "--strictPort"],
    {
      cwd: webRoot,
      env: { ...process.env, BROWSER: "none" },
      stdio: "inherit"
    }
  );

  serverProcess.once("exit", (code, signal) => {
    serverExit = { code, signal };
  });

  await waitForServer();

  const testProcess = spawn(
    process.execPath,
    [playwrightCli, "test", "--config", playwrightConfig, ...process.argv.slice(2)],
    {
      cwd: webRoot,
      env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
      stdio: "inherit"
    }
  );

  const testExit = await waitForExit(testProcess);
  await stopServer();

  if (testExit.signal) {
    process.kill(process.pid, testExit.signal);
  } else {
    process.exitCode = testExit.code ?? 1;
  }
} catch (error) {
  await stopServer();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
