import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRecruitingStore } from "../lib/server/recruiting-store.js";

const tempDir = await mkdtemp(join(tmpdir(), "recruiting-store-"));
const filePath = join(tempDir, "state.json");

try {
  const store = createRecruitingStore({ filePath });

  const job = await store.createJob({
    title: "高级产品经理",
    department: "产品部",
    location: "上海 / 远程",
    jd: "负责产品发现、数据分析和跨团队协作。",
    criteria: [
      { name: "产品发现", weight: 40, anchor: "能验证客户问题并收敛 MVP。" },
      { name: "数据分析", weight: 30, anchor: "能用指标支持产品决策。" },
      { name: "干系人协同", weight: 30, anchor: "能协调研发、销售和管理层。" }
    ]
  });

  assert.equal(job.criteria.every((criterion) => criterion.approved), true);
  assert.equal(job.rubricApproved, true);

  const candidate = await store.createCandidateFromResume({
    fileName: "chen-an.txt",
    resumeText: "陈安\nalex.chen@example.com\n高级产品经理, 星河科技, 2021-2025\n产品发现, 数据分析",
    profile: {
      name: "陈安",
      email: "alex.chen@example.com",
      skills: [{ name: "产品发现", evidence: "产品发现, 数据分析" }],
      workHistory: [],
      education: []
    },
    productResumeScore: {
      totalScore: 82,
      recommendationLevel: "建议进入下一轮",
      dimensions: []
    },
    parsingWorkflow: {
      steps: [{ id: "deepseek-parse", label: "DeepSeek parse", status: "completed" }],
      quality: { score: 96 }
    },
    textExtraction: {
      method: "plain-text",
      extractedTextLength: 86
    }
  });

  assert.equal(candidate.hasResume, true);
  assert.deepEqual(candidate.resume.parsedProfile, candidate.profile);
  assert.equal(candidate.resume.productResumeScore.totalScore, 82);
  assert.equal(candidate.resume.productResumeScore.recommendationLevel, "建议进入下一轮");
  assert.equal(candidate.resume.parsingWorkflow.quality.score, 96);
  assert.equal(candidate.resume.textExtraction.method, "plain-text");
  assert.equal(candidate.stage, "待初筛");

  const screeningRun = await store.saveScreeningRun({
    jobId: job.id,
    candidateId: candidate.id,
    result: {
      overallRecommendation: "review",
      overallScore: 3,
      summary: "候选人值得进入人工复核。",
      criteria: [],
      reviewerChecklist: []
    },
    modelConfig: {
      provider: "mock-compatible",
      model: "mock-recruiting-cn",
      credentialId: "cred_demo"
    }
  });

  assert.equal(screeningRun.status, "待人工确认");

  const decision = await store.recordHumanDecision({
    screeningRunId: screeningRun.id,
    decision: "进入面试",
    reviewerName: "HR 张三",
    note: "证据充分，进入第一轮面试。"
  });

  assert.equal(decision.stage, "进入面试");

  const freshStore = createRecruitingStore({ filePath });
  const snapshot = await freshStore.getSnapshot();

  assert.equal(snapshot.jobs.length, 1);
  assert.equal(snapshot.candidates.length, 1);
  assert.equal(snapshot.screeningRuns.length, 1);
  assert.equal(snapshot.humanDecisions.length, 1);
  assert.equal(snapshot.auditEvents.length, 4);
  assert.deepEqual(snapshot.candidates[0].resume.parsedProfile, snapshot.candidates[0].profile);
  assert.equal(snapshot.candidates[0].resume.productResumeScore.totalScore, 82);
  assert.equal(snapshot.candidates[0].stage, "进入面试");

  const previousStatePath = process.env.RECRUITING_STATE_FILE;
  process.env.RECRUITING_STATE_FILE = filePath;
  const envStoreSnapshot = await createRecruitingStore().getSnapshot();
  assert.equal(envStoreSnapshot.jobs.length, 1);
  if (previousStatePath === undefined) {
    delete process.env.RECRUITING_STATE_FILE;
  } else {
    process.env.RECRUITING_STATE_FILE = previousStatePath;
  }

  const legacyProfile = {
    name: "Legacy Candidate",
    email: "legacy@example.com",
    skills: [{ name: "Product discovery", evidence: "Led discovery sprints" }],
    workHistory: [],
    education: []
  };
  const legacyStatePath = join(tempDir, "legacy-state.json");
  await writeFile(
    legacyStatePath,
    `${JSON.stringify(
      {
        candidates: [
          {
            id: "cand_legacy",
            name: "Legacy Candidate",
            email: "legacy@example.com",
            stage: "待初筛",
            hasResume: true,
            resume: {
              fileName: "legacy.txt",
              textLength: 32,
              uploadedAt: "2026-06-02T00:00:00.000Z"
            },
            profile: legacyProfile,
            productResumeScore: {
              totalScore: 74,
              recommendationLevel: "建议进入下一轮"
            },
            createdAt: "2026-06-02T00:00:00.000Z",
            updatedAt: "2026-06-02T00:00:00.000Z"
          }
        ]
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  const legacySnapshot = await createRecruitingStore({ filePath: legacyStatePath }).getSnapshot();
  assert.deepEqual(legacySnapshot.candidates[0].resume.parsedProfile, legacyProfile);
  assert.equal(legacySnapshot.candidates[0].resume.productResumeScore.totalScore, 74);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("recruiting-store.test.mjs passed");
