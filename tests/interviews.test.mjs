import assert from "node:assert/strict";
import {
  canGenerateInterviewAi,
  validateInterviewGuide,
  validateInterviewSummary
} from "../lib/domain/interviews.js";
import { validateSchema } from "../lib/ai/schemas.js";

assert.deepEqual(
  canGenerateInterviewAi({ hasVerifiedUserApiConnection: false }),
  {
    ok: false,
    code: "USER_API_CONNECTION_REQUIRED",
    message: "请先连接并验证企业自己的模型 API，再使用面试 AI。"
  }
);

const guideResult = validateInterviewGuide(
  {
    interviewType: "technical",
    openingScript: "Thanks for joining.",
    questions: [
      {
        criterionId: "crit_1",
        question: "Tell me about a system you designed.",
        followUps: ["What tradeoffs did you consider?"],
        strongSignal: "Clear tradeoff reasoning.",
        weakSignal: "Cannot explain decisions."
      }
    ],
    candidateSpecificClarifications: ["Clarify queue-worker experience."]
  },
  [{ id: "crit_1", approved: true }]
);

assert.deepEqual(guideResult, { valid: true, errors: [] });

const badGuideResult = validateInterviewGuide(
  {
    interviewType: "technical",
    openingScript: "Thanks for joining.",
    questions: [
      {
        criterionId: "crit_missing",
        question: "Generic culture fit question?",
        followUps: [],
        strongSignal: "",
        weakSignal: ""
      }
    ],
    candidateSpecificClarifications: []
  },
  [{ id: "crit_1", approved: true }]
);

assert.equal(badGuideResult.valid, false);
assert.match(badGuideResult.errors.join(" "), /approved criterion/);

const hiringManagerGuide = {
  candidateName: "陈安",
  jobTitle: "高级产品经理",
  questionCount: 4,
  evidenceBasis: "基于候选人的产品发现、数据分析和项目推进经历生成。",
  interviewType: "hiring_manager",
  questions: [
    {
      sequence: 1,
      question: "请展开说明你在产品发现项目中如何判断需求优先级？",
      questionType: "简历深挖型问题",
      dimension: "需求分析与产品判断力",
      evidence: "简历提到产品发现和用户访谈。",
      weight: 25,
      score5: "回答具体，有项目细节、量化结果和复盘。",
      score3: "能说明职责，但缺少关键数据或个人判断。",
      score1: "回答泛泛，难以验证真实能力。"
    },
    {
      sequence: 2,
      question: "请举例说明你如何用数据验证产品方案有效性？",
      questionType: "数据分析型问题",
      dimension: "数据分析与指标意识",
      evidence: "岗位要求数据分析能力。",
      weight: 25,
      score5: "能定义指标、说明分析方法和业务结果。",
      score3: "能描述数据使用，但指标和结果不完整。",
      score1: "无法说明数据如何影响决策。"
    },
    {
      sequence: 3,
      question: "请说明一次你推动跨团队项目落地的过程。",
      questionType: "项目推进型问题",
      dimension: "项目推进与跨团队协作",
      evidence: "岗位要求跨团队推进。",
      weight: 25,
      score5: "能说明冲突、资源协调和交付结果。",
      score3: "能描述协作过程，但缺少冲突处理细节。",
      score1: "只描述参与，无法体现 owner 意识。"
    },
    {
      sequence: 4,
      question: "请讲一个你把用户痛点转化为产品方案的案例。",
      questionType: "产品思维型问题",
      dimension: "用户洞察与场景理解",
      evidence: "简历提到用户访谈。",
      weight: 25,
      score5: "能清楚说明痛点、方案权衡、上线和复盘。",
      score3: "能描述方案，但缺少权衡或复盘。",
      score1: "问题和方案关联较弱。"
    }
  ],
  scoringMethod: "单题加权得分 = 该题得分 / 5 × 该题权重；最终得分 = 所有单题加权得分之和。",
  scoringSheet: [
    { sequence: 1, weight: 25, interviewerScore: null, weightedScore: null },
    { sequence: 2, weight: 25, interviewerScore: null, weightedScore: null },
    { sequence: 3, weight: 25, interviewerScore: null, weightedScore: null },
    { sequence: 4, weight: 25, interviewerScore: null, weightedScore: null }
  ],
  recommendationLevel: "待面试评分后生成",
  conclusionSummary: "请面试官根据回答表现填写最终结论，并进行人工复核。",
  reportMarkdown: "【产品岗面试问题与评分方案】"
};

assert.deepEqual(validateSchema("interviewGuide", hiringManagerGuide), { valid: true, errors: [] });
assert.deepEqual(validateInterviewGuide(hiringManagerGuide, []), { valid: true, errors: [] });

const invalidQuestionCountGuide = { ...hiringManagerGuide, questionCount: 2 };
assert.equal(validateSchema("interviewGuide", invalidQuestionCountGuide).valid, false);

assert.deepEqual(
  validateInterviewSummary({
    summary: "Candidate described queue design.",
    citedNoteIds: ["note_1"],
    introducesNewClaims: false
  }),
  { valid: true, errors: [] }
);

assert.equal(
  validateInterviewSummary({
    summary: "Candidate is probably very senior.",
    citedNoteIds: [],
    introducesNewClaims: true
  }).valid,
  false
);

assert.deepEqual(
  validateSchema("interviewSummary", {
    summary: "候选人解释了产品发现和数据分析案例。",
    citedNoteIds: ["note_1"],
    introducesNewClaims: false,
    hiringSignals: ["能用指标支持决策"],
    followUpRisks: ["需确认跨团队推进规模"],
    finalInterviewScore: 82,
    recommendationLevel: "建议进入下一轮",
    scoringSheet: [
      {
        sequence: 1,
        weight: 100,
        interviewerScore: 4.1,
        weightedScore: 82,
        scoringReason: "回答包含指标拆解和复盘证据。"
      }
    ]
  }),
  { valid: true, errors: [] }
);

assert.equal(
  validateSchema("interviewSummary", {
    summary: "缺少引用。",
    citedNoteIds: [],
    introducesNewClaims: true,
    hiringSignals: [],
    followUpRisks: []
  }).valid,
  false
);

console.log("interviews.test.mjs passed");
