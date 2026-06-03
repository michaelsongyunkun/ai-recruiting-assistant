import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecruitingStore } from "../lib/server/recruiting-store.js";

const tempDir = await mkdtemp(join(tmpdir(), "interview-store-"));
const filePath = join(tempDir, "state.json");

try {
  const store = createRecruitingStore({ filePath });
  const job = await store.createJob({
    title: "高级产品经理",
    criteria: [{ id: "crit_1", name: "产品发现", weight: 50, anchor: "验证客户问题。" }]
  });
  const candidate = await store.createCandidateFromResume({
    fileName: "resume.txt",
    resumeText: "陈安\nalex.chen@example.com\n产品发现",
    profile: { name: "陈安", email: "alex.chen@example.com", skills: [], workHistory: [], education: [] }
  });
  const screeningRun = await store.saveScreeningRun({
    jobId: job.id,
    candidateId: candidate.id,
    result: {
      overallRecommendation: "review",
      overallScore: 3,
      summary: "建议进入面试。",
      criteria: [],
      reviewerChecklist: []
    },
    modelConfig: { provider: "mock-compatible", credentialId: "cred_mock" }
  });

  const guide = await store.saveInterviewGuide({
    jobId: job.id,
    candidateId: candidate.id,
    screeningRunId: screeningRun.id,
    result: {
      interviewType: "recruiter_screen",
      openingScript: "欢迎参加面试。",
      questions: [
        {
          criterionId: "crit_1",
          question: "请讲一个产品发现案例。",
          followUps: ["你如何验证问题？"],
          strongSignal: "能说明客户证据。",
          weakSignal: "只讲主观判断。"
        }
      ],
      candidateSpecificClarifications: ["确认客户访谈规模。"]
    },
    modelConfig: { provider: "mock-compatible", credentialId: "cred_mock" }
  });

  assert.equal(guide.status, "待记录面试");
  assert.equal(guide.candidateId, candidate.id);

  const note = await store.addInterviewNote({
    interviewGuideId: guide.id,
    authorName: "面试官李四",
    content: "候选人说明了 12 次客户访谈和需求收敛过程。"
  });

  assert.equal(note.interviewGuideId, guide.id);
  assert.match(note.content, /客户访谈/);

  const summary = await store.saveInterviewSummary({
    interviewGuideId: guide.id,
    result: {
      summary: "候选人能清楚解释产品发现过程。",
      citedNoteIds: [note.id],
      introducesNewClaims: false,
      hiringSignals: ["能用访谈证据收敛需求"],
      followUpRisks: ["仍需确认数据分析深度"]
    },
    modelConfig: { provider: "mock-compatible", credentialId: "cred_mock" }
  });

  assert.equal(summary.status, "待人工确认");
  assert.deepEqual(summary.result.citedNoteIds, [note.id]);

  const confirmation = await store.confirmInterviewSummary({
    interviewSummaryId: summary.id,
    reviewerName: "HR 张三",
    decision: "建议推进下一轮",
    note: "总结引用充分。"
  });

  assert.equal(confirmation.status, "已人工确认");

  const fresh = createRecruitingStore({ filePath });
  const snapshot = await fresh.getPublicSnapshot();
  assert.equal(snapshot.interviewGuides.length, 1);
  assert.equal(snapshot.interviewNotes.length, 1);
  assert.equal(snapshot.interviewSummaries.length, 1);
  assert.equal(snapshot.interviewConfirmations.length, 1);
  assert.equal(snapshot.candidates[0].stage, "建议推进下一轮");
  assert.equal(snapshot.auditEvents.length, 7);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("interview-store.test.mjs passed");
