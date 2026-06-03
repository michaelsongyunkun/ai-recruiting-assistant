import assert from "node:assert/strict";
import {
  buildInterviewGuideUserPrompt,
  buildInterviewSummaryUserPrompt,
  buildProductResumeScoringUserPrompt,
  buildResumeParserUserPrompt,
  buildScreeningUserPrompt,
  buildSystemPrompt,
  HIRING_MANAGER_INTERVIEW_GUIDE_SYSTEM_PROMPT,
  PRODUCT_RESUME_SCORING_SYSTEM_PROMPT
} from "../lib/ai/prompts.js";

const systemPrompt = buildSystemPrompt("screening");
assert.match(systemPrompt, /不要使用年龄、性别、种族/);
assert.match(systemPrompt, /返回符合指定 schema 的有效 JSON/);

const screeningPrompt = buildScreeningUserPrompt({
  job: {
    title: "高级产品经理",
    jd: "负责产品发现和数据分析。",
    criteria: [{ id: "crit_1", name: "产品发现", weight: 40, anchor: "验证客户问题。" }]
  },
  candidate: {
    name: "陈安",
    email: "alex.chen@example.com",
    profile: {
      skills: [{ name: "产品发现", evidence: "做过 20 次客户访谈。" }],
      workHistory: [{ company: "星河科技", title: "产品经理", period: "2021-2025" }]
    }
  }
});

assert.match(screeningPrompt, /高级产品经理/);
assert.match(screeningPrompt, /crit_1/);
assert.match(screeningPrompt, /产品发现/);
assert.match(screeningPrompt, /reviewerChecklist/);

const resumeParserPrompt = buildResumeParserUserPrompt({
  fileName: "chen-an.txt",
  resumeText: "陈安\nalex.chen@example.com\n高级产品经理, 星河科技, 2021-2025\n产品发现, 数据分析"
});

assert.match(resumeParserPrompt, /结构化 JSON/);
assert.match(resumeParserPrompt, /workHistory/);
assert.match(resumeParserPrompt, /protectedTraitsInferred/);
assert.match(resumeParserPrompt, /chen-an\.txt/);
assert.match(PRODUCT_RESUME_SCORING_SYSTEM_PROMPT, /产品经理岗位简历初筛评分助手/);
assert.match(PRODUCT_RESUME_SCORING_SYSTEM_PROMPT, /产品岗位方向匹配度：20分/);

const productScorePrompt = buildProductResumeScoringUserPrompt({
  job: {
    title: "高级产品经理",
    jd: "负责 AI 产品、数据分析、跨团队项目推进。"
  },
  candidateProfile: {
    name: "陈安",
    skills: [{ name: "数据分析", evidence: "数据分析" }],
    workHistory: [{ title: "产品经理", company: "星河科技", evidence: "产品经理" }]
  }
});

assert.match(productScorePrompt, /hardRequirements/);
assert.match(productScorePrompt, /recommendationLevel/);
assert.match(productScorePrompt, /高级产品经理/);

const guidePrompt = buildInterviewGuideUserPrompt({
  jobTitle: "高级产品经理",
  criteria: [{ id: "crit_1", name: "产品发现" }],
  candidateName: "陈安",
  screeningResult: { summary: "客户访谈证据充分。" }
});

assert.match(guidePrompt, /candidateSpecificClarifications/);
assert.match(guidePrompt, /crit_1/);

const hiringManagerGuidePrompt = buildInterviewGuideUserPrompt({
  job: {
    title: "高级产品经理",
    jd: "负责 AI 产品、数据分析和跨团队推进。"
  },
  candidateProfile: {
    name: "陈安",
    skills: [{ name: "用户访谈", evidence: "组织用户访谈并沉淀需求" }]
  },
  questionCount: 5,
  focusRequirements: "重点考察 AI 产品经验和数据能力"
});

assert.match(HIRING_MANAGER_INTERVIEW_GUIDE_SYSTEM_PROMPT, /产品岗面试问题生成与评分助手/);
assert.match(HIRING_MANAGER_INTERVIEW_GUIDE_SYSTEM_PROMPT, /所需问题数量/);
assert.match(HIRING_MANAGER_INTERVIEW_GUIDE_SYSTEM_PROMPT, /单题加权得分/);
assert.match(hiringManagerGuidePrompt, /questionCount/);
assert.match(hiringManagerGuidePrompt, /所需问题数量/);
assert.match(hiringManagerGuidePrompt, /重点考察 AI 产品经验和数据能力/);
assert.match(hiringManagerGuidePrompt, /高级产品经理/);
assert.match(hiringManagerGuidePrompt, /用户访谈/);

const summaryPrompt = buildInterviewSummaryUserPrompt({
  notes: "note_1: 候选人解释了指标看板。",
  noteIds: ["note_1"],
  guideResult: {
    questionCount: 1,
    questions: [{ sequence: 1, question: "请说明指标看板项目。", weight: 100 }],
    scoringSheet: [{ sequence: 1, weight: 100, interviewerScore: null, weightedScore: null }]
  }
});

assert.match(summaryPrompt, /citedNoteIds/);
assert.match(summaryPrompt, /note_1/);
assert.match(summaryPrompt, /候选人面试回答/);
assert.match(summaryPrompt, /finalInterviewScore/);
assert.match(summaryPrompt, /scoringSheet/);

console.log("prompts.test.mjs passed");
