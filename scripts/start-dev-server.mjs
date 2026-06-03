import { openSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const port = process.argv[2] || "3100";
const mode = process.argv[3] || "start";
const out = openSync(join(cwd, "dev-server.out.log"), "a");
const err = openSync(join(cwd, "dev-server.err.log"), "a");

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", mode, "-p", port],
  {
    cwd,
    detached: true,
    stdio: ["ignore", out, err],
    windowsHide: true
  }
);

writeFileSync(join(cwd, "dev-server.pid"), String(child.pid));
child.unref();

console.log(`Started AI Recruiting Assistant (${mode}) on http://localhost:${port} with PID ${child.pid}`);
