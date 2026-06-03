import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const shouldInstall = process.env.RENDER === "true" || process.argv.includes("--force");
const strict = process.argv.includes("--strict");
const requirementsPath = join(process.cwd(), "requirements.txt");
const targetPath = join(process.cwd(), ".python-packages");

if (!shouldInstall) {
  console.log("Skipping Python document extraction dependencies outside Render.");
  process.exit(0);
}

function finishWithWarning(message, result = null) {
  console.warn(message);
  if (result?.error) console.warn(result.error);
  if (strict) {
    process.exit(1);
  }
  console.warn("Continuing build; PDF resume parsing will report a runtime dependency error if pypdf is unavailable.");
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

if (!existsSync(requirementsPath)) {
  finishWithWarning("requirements.txt is missing; PDF resume extraction dependencies cannot be installed.");
}

await mkdir(targetPath, { recursive: true });

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
    "--no-cache-dir",
    "--target",
    targetPath,
    "-r",
    requirementsPath
  ]);

  if (installResult.ok) {
    console.log(`Python document extraction dependencies installed into ${targetPath}.`);
    process.exit(0);
  }
  lastResult = installResult;
}

finishWithWarning("Unable to install Python document extraction dependencies for Render.", lastResult);
