import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecruitingStore } from "../lib/server/recruiting-store.js";

async function seedApplication(store) {
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
    }
  });
  await store.recordHumanDecision({
    screeningRunId: screeningRun.id,
    decision: "进入面试",
    reviewerName: "HR 张三"
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
          followUps: [],
          strongSignal: "证据清楚。",
          weakSignal: "没有证据。"
        }
      ],
      candidateSpecificClarifications: []
    }
  });
  const note = await store.addInterviewNote({
    interviewGuideId: guide.id,
    authorName: "面试官李四",
    content: "候选人说明了客户访谈。"
  });
  const summary = await store.saveInterviewSummary({
    interviewGuideId: guide.id,
    result: {
      summary: "候选人能说明产品发现过程。",
      citedNoteIds: [note.id],
      introducesNewClaims: false,
      hiringSignals: ["访谈证据明确"],
      followUpRisks: []
    }
  });
  await store.confirmInterviewSummary({
    interviewSummaryId: summary.id,
    reviewerName: "HR 张三",
    decision: "建议推进下一轮"
  });

  return { job, candidate };
}

const tempDir = await mkdtemp(join(tmpdir(), "delete-store-"));

try {
  const candidateFilePath = join(tempDir, "delete-candidate.json");
  const candidateStore = createRecruitingStore({ filePath: candidateFilePath });
  const { candidate } = await seedApplication(candidateStore);

  const deletedCandidate = await candidateStore.deleteCandidate(candidate.id);
  assert.equal(deletedCandidate.id, candidate.id);

  const candidateSnapshot = await candidateStore.getPublicSnapshot();
  assert.equal(candidateSnapshot.jobs.length, 1);
  assert.equal(candidateSnapshot.candidates.length, 0);
  assert.equal(candidateSnapshot.screeningRuns.length, 0);
  assert.equal(candidateSnapshot.humanDecisions.length, 0);
  assert.equal(candidateSnapshot.interviewGuides.length, 0);
  assert.equal(candidateSnapshot.interviewNotes.length, 0);
  assert.equal(candidateSnapshot.interviewSummaries.length, 0);
  assert.equal(candidateSnapshot.interviewConfirmations.length, 0);
  assert.equal(candidateSnapshot.auditEvents.at(-1).action, "删除候选人");

  const jobFilePath = join(tempDir, "delete-job.json");
  const jobStore = createRecruitingStore({ filePath: jobFilePath });
  const { job } = await seedApplication(jobStore);

  const deletedJob = await jobStore.deleteJob(job.id);
  assert.equal(deletedJob.id, job.id);

  const jobSnapshot = await jobStore.getPublicSnapshot();
  assert.equal(jobSnapshot.jobs.length, 0);
  assert.equal(jobSnapshot.candidates.length, 1);
  assert.equal(jobSnapshot.screeningRuns.length, 0);
  assert.equal(jobSnapshot.humanDecisions.length, 0);
  assert.equal(jobSnapshot.interviewGuides.length, 0);
  assert.equal(jobSnapshot.interviewNotes.length, 0);
  assert.equal(jobSnapshot.interviewSummaries.length, 0);
  assert.equal(jobSnapshot.interviewConfirmations.length, 0);
  assert.equal(jobSnapshot.auditEvents.at(-1).action, "删除岗位");

  await assert.rejects(() => jobStore.deleteJob("job_missing"), /JOB_NOT_FOUND/);
  await assert.rejects(() => candidateStore.deleteCandidate("cand_missing"), /CANDIDATE_NOT_FOUND/);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("deletion-store.test.mjs passed");
