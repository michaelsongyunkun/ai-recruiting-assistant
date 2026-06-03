import assert from "node:assert/strict";
import {
  canRunScreening,
  summarizeScreeningResult,
  validateScreeningRecommendation
} from "../lib/domain/screening.js";

assert.deepEqual(
  validateScreeningRecommendation({
    overallRecommendation: "review",
    overallScore: 3,
    summary: "Candidate may fit the role.",
    criteria: [
      {
        criterionId: "crit_1",
        score: 3,
        confidence: "medium",
        evidence: [],
        missingInformation: [],
        riskFlags: []
      }
    ],
    reviewerChecklist: []
  }),
  {
    valid: false,
    errors: ["crit_1 requires evidence or missing information"]
  }
);

assert.deepEqual(
  canRunScreening({
    rubricApproved: true,
    hasResumeUploaded: true,
    hasVerifiedUserApiConnection: false
  }),
  {
    ok: false,
    code: "USER_API_CONNECTION_REQUIRED",
    message: "请先连接并验证企业自己的模型 API，再运行初筛。"
  }
);

assert.deepEqual(
  canRunScreening({
    rubricApproved: true,
    hasResumeUploaded: false,
    hasVerifiedUserApiConnection: true
  }),
  {
    ok: false,
    code: "RESUME_UPLOAD_REQUIRED",
    message: "请先上传并解析候选人简历，再运行初筛。"
  }
);

assert.deepEqual(
  canRunScreening({
    rubricApproved: false,
    hasResumeUploaded: true,
    hasVerifiedUserApiConnection: true
  }),
  {
    ok: false,
    code: "RUBRIC_APPROVAL_REQUIRED",
    message: "请先审批岗位评分标准，再运行初筛。"
  }
);

const summary = summarizeScreeningResult({
  overallRecommendation: "review",
  overallScore: 3,
  criteria: [
    {
      criterionId: "crit_1",
      score: 4,
      confidence: "high",
      evidence: ["Led product discovery for enterprise workflow."],
      missingInformation: [],
      riskFlags: []
    },
    {
      criterionId: "crit_2",
      score: 0,
      confidence: "low",
      evidence: [],
      missingInformation: ["No analytics examples found."],
      riskFlags: []
    }
  ]
});

assert.equal(summary.evidenceCount, 1);
assert.equal(summary.missingInformationCount, 1);

console.log("screening.test.mjs passed");
