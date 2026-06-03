import assert from "node:assert/strict";
import { scoreProductManagerResume } from "../lib/documents/product-resume-scorer.js";

const job = {
  id: "job_pm",
  title: "高级产品经理",
  jd: "负责产品发现、数据分析和跨团队推进。",
  criteria: []
};

const candidateProfile = {
  name: "陈安",
  email: "alex.chen@example.com",
  skills: [{ name: "产品发现", evidence: "负责产品发现和用户访谈" }],
  workHistory: [],
  education: [],
  protectedTraitsInferred: false
};

const successfulScore = {
  candidateName: "陈安",
  jobTitle: "高级产品经理",
  hardRequirements: [{ requirement: "产品经验", status: "满足", evidence: "简历中出现产品发现经历" }],
  dimensions: [],
  totalScore: 72,
  recommendationLevel: "建议进入下一轮",
  matchingPoints: ["有产品发现经历"],
  risksOrGaps: ["缺少完整上线复盘证据"],
  finalAdvice: "建议进入下一轮，并由招聘人员结合岗位优先级复核。",
  reportMarkdown: "【产品岗简历初筛评分】\n\n总分：72/100"
};

const calls = [];
const result = await scoreProductManagerResume({
  store: {
    getActiveModelConnection: async () => ({
      id: "model_score",
      organizationId: "org_demo",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      workflows: ["productResumeScoring"],
      status: "verified",
      credentialId: "cred_score",
      apiKey: "sk-test"
    })
  },
  job,
  candidateProfile,
  generateJsonImpl: async (input) => {
    calls.push(input);
    if (calls.length === 1) {
      return {
        ok: false,
        code: "MODEL_OUTPUT_VALIDATION_FAILED",
        message: "模型输出不符合要求的结构。",
        errors: ["totalScore must equal the sum of dimension scores"],
        modelConfig: {
          id: "model_score",
          provider: "deepseek",
          workflow: "productResumeScoring"
        }
      };
    }
    return {
      ok: true,
      parsed: successfulScore,
      modelConfig: {
        id: "model_score",
        provider: "deepseek",
        workflow: "productResumeScoring"
      }
    };
  }
});

assert.equal(result.ok, true);
assert.equal(result.score.totalScore, 72);
assert.equal(calls.length, 2);
assert.match(calls[1].user, /totalScore must equal the sum of dimension scores/);
assert.equal(result.modelConfig.promptVersion, "product-resume-scoring-deepseek-v1");

const looseDimensions = [
  ["产品方向匹配", "20", "16"],
  ["产品生命周期", "18", "12"],
  ["用户需求分析", "12", "8"],
  ["数据指标能力", "15", "9"],
  ["项目推进协作", "12", "7"],
  ["商业理解", "10", "5"],
  ["技术表达", "8", "5"],
  ["成长潜力", "5", "4"]
].map(([name, weight, score]) => ({
  name,
  weight,
  score,
  reason: `${name} 有简历证据。`,
  informationStatus: "充分",
  extraNote: "模型多返回的字段应被忽略"
}));

const looseResult = await scoreProductManagerResume({
  store: {
    getActiveModelConnection: async () => ({
      id: "model_score",
      organizationId: "org_demo",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      workflows: ["productResumeScoring"],
      status: "verified",
      credentialId: "cred_score",
      apiKey: "sk-test"
    })
  },
  job,
  candidateProfile,
  generateJsonImpl: async () => ({
    ok: false,
    code: "MODEL_OUTPUT_VALIDATION_FAILED",
    message: "模型输出不符合要求的结构。",
    errors: [
      "product resume score contains unknown keys",
      "recommendationLevel is invalid",
      "totalScore must equal the sum of dimension scores"
    ],
    raw: {
      candidateName: "",
      jobTitle: "",
      hardRequirements: [
        {
          requirement: "产品经验",
          status: "部分满足",
          evidence: "简历中出现产品发现经历",
          comment: "额外字段"
        }
      ],
      dimensions: looseDimensions,
      totalScore: "70",
      recommendationLevel: "推荐进入下一轮",
      matchingPoints: "有产品发现经历",
      risksOrGaps: "缺少上线复盘证据",
      finalAdvice: "建议进入下一轮，并由招聘人员结合岗位优先级复核。",
      extraSummary: "额外字段"
    },
    modelConfig: {
      id: "model_score",
      provider: "deepseek",
      workflow: "productResumeScoring"
    }
  })
});

assert.equal(looseResult.ok, true);
assert.equal(looseResult.score.totalScore, 66);
assert.equal(looseResult.score.candidateName, candidateProfile.name);
assert.equal(looseResult.score.jobTitle, job.title);
assert.equal(looseResult.score.hardRequirements[0].status, "信息不足");
assert.equal(looseResult.score.recommendationLevel, "可作为备选");
assert.equal(looseResult.score.dimensions.length, 8);
assert.equal(looseResult.score.matchingPoints[0], "有产品发现经历");
assert.match(looseResult.score.reportMarkdown, /产品岗简历初筛评分/);

console.log("product-resume-scorer.test.mjs passed");
