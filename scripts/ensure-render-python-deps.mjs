import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const shouldInstall = process.env.RENDER === "true" || process.argv.includes("--force");

if (!shouldInstall) {
  console.log("Skipping Python document extraction dependencies outside Render.");
  process.exit(0);
}

function pythonCandidates() {
  const configured = [process.env.RESUME_EXTRACT_PYTHON, process.env.PYTHON].filter(Boolean);
  const candidates = configured.map((command) => ({ command, argsPrefix: [] }));
  candidates.push({ command: "python3", argsPrefix: [] });
  candidates.push({ command: "python", argsPrefix: [] });
  if (process.platform === "win32") candidates.push({ command: "py", argsPrefix: ["-3"] });
  return candidates;
}

function run(command, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        env: process.env,
        shell: false,
        stdio: "inherit",
        windowsHide: true
      });
    } catch (error) {
      resolve({ ok: false, error: error.message });
      return;
    }

    child.on("error", (error) => resolve({ ok: false, error: error.message }));
    child.on("close", (code) => resolve({ ok: code === 0, code }));
  });
}

const requirementsPath = join(process.cwd(), "requirements.txt");
if (!existsSync(requirementsPath)) {
  console.error("requirements.txt is missing; PDF resume extraction dependencies cannot be installed.");
  process.exit(1);
}

let lastResult = null;
for (const candidate of pythonCandidates()) {
  const versionResult = await run(candidate.command, [...candidate.argsPrefix, "--version"]);
  if (!versionResult.ok) {
    lastResult = versionResult;
    continue;
  }

  const installResult = await run(candidate.command, [
    ...candidate.argsPrefix,
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "-r",
    requirementsPath
  ]);

  if (installResult.ok) {
    console.log("Python document extraction dependencies installed.");
    process.exit(0);
  }
  lastResult = installResult;
}

console.error("Unable to install Python document extraction dependencies for Render.");
if (lastResult?.error) console.error(lastResult.error);
process.exit(1);
