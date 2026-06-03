import assert from "node:assert/strict";
import {
  formatResumeParsingReport,
  getResumeParsingReportFileName
} from "../lib/documents/resume-export.js";

const report = formatResumeParsingReport({
  fileName: "简历.pdf",
  exportedAt: "2026-06-02T00:00:00.000Z",
  profile: {
    name: "宋昀锟",
    email: "3152482377@qq.com",
    phone: "18565657525",
    location: "深圳",
    workHistory: [
      {
        title: "产品运营",
        company: "广东浩鲸科技有限公司",
        startDate: "2026.03",
        endDate: "2026.05",
        responsibilities: ["用户反馈收集", "需求分类"],
        achievements: ["输出产品文档"],
        evidence: "简历明确列出产品运营经历"
      }
    ],
    skills: [{ name: "OpenAI API", evidence: "专业技能中列出" }],
    education: [{ institution: "波士顿大学", credential: "本科", date: "2026-2030", evidence: "教育经历" }],
    certifications: [],
    projects: [],
    unsupportedClaims: ["未提供量化业务结果"],
    protectedTraitsInferred: false,
    parsingNotes: ["PDF 文本层提取成功"]
  },
  workflow: {
    quality: { score: 95, summary: "解析质量较好" },
    steps: [{ title: "提取简历文本", status: "success", detail: "PDF 文本层提取成功" }],
    checks: [{ label: "基础信息", status: "success", detail: "识别到姓名和邮箱" }]
  },
  modelConfig: {
    provider: "deepseek",
    model: "deepseek-chat",
    promptVersion: "resume-parser-deepseek-v1"
  }
});

assert.match(report, /# 简历解析结果/);
assert.match(report, /宋昀锟/);
assert.match(report, /广东浩鲸科技有限公司/);
assert.match(report, /提取简历文本/);
assert.match(report, /deepseek-chat/);
assert.match(report, /未提供量化业务结果/);

assert.equal(
  getResumeParsingReportFileName({ candidateName: "宋昀锟", fileName: "简历.pdf" }),
  "宋昀锟-简历解析结果.md"
);

console.log("resume-export.test.mjs passed");
