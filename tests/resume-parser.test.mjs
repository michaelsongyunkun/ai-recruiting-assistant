import assert from "node:assert/strict";
import { parseResumeText } from "../lib/documents/resume-parser.js";
import { buildResumeParsingWorkflow } from "../lib/documents/resume-workflow.js";

const profile = parseResumeText(`Alex Chen
alex.chen@example.com
Senior Software Engineer, Northstar Labs, 2021-2025
B.S. Computer Science, State University
TypeScript, React, PostgreSQL, API design`);

assert.equal(profile.email, "alex.chen@example.com");
assert.equal(profile.workHistory[0].title, "Senior Software Engineer");
assert.equal(profile.workHistory[0].company, "Northstar Labs");
assert.equal(profile.skills.some((skill) => skill.name === "TypeScript"), true);
assert.equal(profile.protectedTraitsInferred, false);

const chineseProfile = parseResumeText(`陈安
alex.chen@example.com
高级产品经理, 星河科技, 2021-2025
TypeScript, React, PostgreSQL, 产品发现, 数据分析`);

assert.equal(chineseProfile.phone, null);
assert.equal(chineseProfile.skills.some((skill) => skill.name === "产品发现"), true);
assert.equal(chineseProfile.skills.some((skill) => skill.name === "数据分析"), true);

const workflow = buildResumeParsingWorkflow({
  file: { name: "alex-chen.txt", size: 220 },
  text: `Alex Chen
alex.chen@example.com
Senior Software Engineer, Northstar Labs, 2021-2025
B.S. Computer Science, State University
TypeScript, React, PostgreSQL, API design`,
  profile
});

assert.equal(workflow.readyToSave, true);
assert.equal(workflow.steps.length, 5);
assert.equal(workflow.checks.some((item) => item.label === "文本提取" && item.status === "success"), true);
assert.equal(workflow.fields.some((item) => item.label === "技能关键词" && item.value === "4 个"), true);

const blockedWorkflow = buildResumeParsingWorkflow({
  file: { name: "resume.pdf", size: 1200 },
  text: "%PDF-1.7 binary object stream",
  profile: parseResumeText("%PDF-1.7 binary object stream")
});

assert.equal(blockedWorkflow.readyToSave, false);
assert.equal(blockedWorkflow.quality.tone, "blocked");

console.log("resume-parser.test.mjs passed");
