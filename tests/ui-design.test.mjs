import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const layout = await readFile("app/layout.tsx", "utf8");
const sidebar = await readFile("components/app-sidebar.tsx", "utf8");
const homeWorkspace = await readFile("components/home-workspace.tsx", "utf8");
const styles = await readFile("app/globals.css", "utf8");

assert.match(layout, /enterpriseTopbar/);
assert.match(layout, /contentCanvas/);

assert.match(sidebar, /Recruiting OS/);
assert.match(sidebar, /navSection/);
assert.match(sidebar, /sidebarCompliance/);

assert.match(homeWorkspace, /opsHero/);
assert.match(homeWorkspace, /opsMetricGrid/);
assert.match(homeWorkspace, /workflowFunnel/);
assert.match(homeWorkspace, /workbenchGrid/);
assert.match(homeWorkspace, /activityLedger/);

assert.match(styles, /--accent:/);
assert.match(styles, /\.enterpriseTopbar/);
assert.match(styles, /\.opsMetricGrid/);
assert.match(styles, /\.workflowFunnel/);
assert.match(styles, /max-width:\s*1440px/);
assert.equal(styles.includes("Arial"), false);

console.log("ui-design.test.mjs passed");
