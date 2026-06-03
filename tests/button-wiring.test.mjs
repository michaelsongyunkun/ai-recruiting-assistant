import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const candidateUploader = await readFile("components/candidate-resume-uploader.tsx", "utf8");
const screeningWorkspace = await readFile("components/screening-workspace.tsx", "utf8");
const interviewWorkspace = await readFile("components/interview-workspace.tsx", "utf8");
const interviewResultsWorkspace = await readFile("components/interview-results-workspace.tsx", "utf8");
const modelApiSettings = await readFile("components/model-api-settings.tsx", "utf8");
const jobsWorkspace = await readFile("components/jobs-workspace.tsx", "utf8");
const candidatesWorkspace = await readFile("components/candidates-workspace.tsx", "utf8");
const workspaceRoute = await readFile("app/api/workspace/route.ts", "utf8");
const resultsPage = await readFile("app/results/page.tsx", "utf8");
const modelConnectionsRoute = await readFile("app/api/settings/model-connections/route.ts", "utf8");

for (const [name, source] of [
  ["candidate uploader", candidateUploader],
  ["screening workspace", screeningWorkspace],
  ["interview workspace", interviewWorkspace]
]) {
  assert.equal(source.includes("useDemoConnection"), false, `${name} must not call demo API flow`);
}

assert.match(candidateUploader, /candidateId:\s*state\.candidateId/);
assert.match(candidateUploader, /\/api\/screening\/run/);
assert.match(candidateUploader, /modelConnections/);
assert.match(candidateUploader, /resumeParserConnection/);
assert.match(candidateUploader, /productResumeScoringConnection/);
assert.match(candidateUploader, /screeningConnection/);
assert.match(screeningWorkspace, /useRouter/);
assert.match(screeningWorkspace, /router\.push\("\/interviews"\)/);
assert.match(screeningWorkspace, /href="\/settings\/model-api"/);
assert.match(interviewWorkspace, /href="\/settings\/model-api"/);
assert.match(interviewWorkspace, /questionCount/);
assert.match(interviewWorkspace, /focusRequirements/);
assert.match(interviewWorkspace, /所需问题数量/);
assert.match(interviewWorkspace, /用人经理面试指南/);
assert.match(interviewWorkspace, /候选人面试回答/);
assert.match(interviewWorkspace, /进行面试评分/);
assert.match(interviewWorkspace, /noteIds:\s*\[payload\.note\.id\]/);
assert.equal(interviewWorkspace.includes("保存面试笔记"), false);
assert.match(interviewResultsWorkspace, /resume\.productResumeScore\?\.totalScore/);
assert.match(interviewResultsWorkspace, /latestSummary\?\.result\?\.finalInterviewScore/);
assert.match(interviewResultsWorkspace, /resumeWeight/);
assert.match(interviewResultsWorkspace, /interviewWeight/);
assert.match(interviewResultsWorkspace, /简历分占比/);
assert.match(interviewResultsWorkspace, /面试分占比/);
assert.equal(interviewResultsWorkspace.includes("localStorage"), false);
assert.equal(interviewResultsWorkspace.includes("录入面试分"), false);
assert.match(resultsPage, /自动接入/);
assert.equal(resultsPage.includes("录入面试分"), false);
assert.match(modelApiSettings, /value:\s*"deepseek"/);
assert.match(modelApiSettings, /label:\s*"DeepSeek"/);
assert.match(modelApiSettings, /https:\/\/api\.deepseek\.com\/v1/);
assert.match(modelApiSettings, /deepseek-chat/);
assert.equal(modelApiSettings.includes("mock-compatible"), false);
assert.equal(modelApiSettings.includes("mock://local"), false);
assert.equal(modelApiSettings.includes("Demo ready"), false);
assert.equal(modelApiSettings.includes("无 Key 演示"), false);
assert.equal(modelApiSettings.includes("不填 Key"), false);
assert.match(modelApiSettings, /面试评分/);
assert.match(modelApiSettings, /deleteModelConnection/);
assert.match(modelApiSettings, /method:\s*"DELETE"/);
assert.match(modelApiSettings, /删除连接/);
assert.equal(modelApiSettings.includes("面试记录总结"), false);
assert.equal(
  candidateUploader.includes("产品岗评分智能体会基于所选岗位描述和 DeepSeek 简历解析结果打分。"),
  false
);
assert.equal(candidateUploader.includes("管理岗位"), false);
assert.match(jobsWorkspace, /新增岗位/);
assert.equal(jobsWorkspace.includes("导入岗位 JD"), false);
assert.equal(
  jobsWorkspace.includes("const defaultCriteria"),
  false,
  "岗位设置新增岗位必须填写岗位评分标准，不能套用固定默认标准"
);
assert.match(jobsWorkspace, /criterionName/);
assert.match(jobsWorkspace, /criterionWeight/);
assert.match(jobsWorkspace, /criterionAnchor/);
assert.match(jobsWorkspace, /criteriaRows/);
assert.match(jobsWorkspace, /addCriterion/);
assert.match(jobsWorkspace, /removeCriterion/);
assert.match(jobsWorkspace, /删除标准/);
assert.match(jobsWorkspace, /评分锚点/);
assert.match(jobsWorkspace, /权重合计需为 100%/);
assert.match(jobsWorkspace, /fetch\("\/api\/jobs"/);
assert.match(jobsWorkspace, /method:\s*"POST"/);
assert.match(jobsWorkspace, /\/api\/jobs\/\$\{job\.id\}/);
assert.match(jobsWorkspace, /method:\s*"DELETE"/);
assert.match(jobsWorkspace, /删除岗位/);
assert.match(candidatesWorkspace, /\/api\/candidates\/\$\{candidate\.id\}/);
assert.match(candidatesWorkspace, /method:\s*"DELETE"/);
assert.match(candidatesWorkspace, /删除候选人/);
assert.match(candidatesWorkspace, /selectedCandidate/);
assert.match(candidatesWorkspace, /查看档案/);
assert.match(candidatesWorkspace, /候选人档案详情/);
assert.match(candidatesWorkspace, /parsedProfile/);
assert.match(candidatesWorkspace, /productResumeScore/);
assert.match(candidatesWorkspace, /关闭档案/);
assert.match(modelConnectionsRoute, /export async function DELETE/);
assert.match(modelConnectionsRoute, /deleteModelConnection/);
assert.equal(workspaceRoute.includes("defaultJobInput"), false, "workspace must not recreate deleted jobs");

console.log("button-wiring.test.mjs passed");
