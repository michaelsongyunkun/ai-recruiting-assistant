import assert from "node:assert/strict";
import { validateJobInput } from "../lib/domain/jobs.js";

const valid = validateJobInput({
  title: "高级产品经理",
  department: "产品部",
  location: "远程",
  jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
  criteria: [
    {
      name: "产品发现",
      weight: "35",
      anchor: "能发现客户问题、验证假设，并把需求收敛为可执行 MVP。",
      approved: true
    },
    {
      name: "干系人协同",
      weight: 25,
      anchor: "能协调研发、销售、客服和管理层，推动关键取舍。",
      approved: true
    },
    {
      name: "数据分析",
      weight: 25,
      anchor: "能用产品指标、漏斗和实验结果支持决策。",
      approved: true
    },
    {
      name: "书面表达",
      weight: 15,
      anchor: "能写清楚产品方案、上线说明和决策记录。",
      approved: true
    }
  ]
});

assert.equal(valid.ok, true);
assert.equal(valid.job.title, "高级产品经理");
assert.equal(valid.job.jd, "负责产品发现、数据分析、跨团队协作和产品方案输出。");
assert.equal(valid.job.criteria.length, 4);
assert.equal(valid.job.criteria[0].weight, 35);
assert.equal(valid.job.criteria.every((criterion) => criterion.approved), true);

const missingCriteria = validateJobInput({
  title: "高级产品经理",
  jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
  criteria: []
});

assert.equal(missingCriteria.ok, false);
assert.match(missingCriteria.message, /评分标准/);

const incompleteCriterion = validateJobInput({
  title: "高级产品经理",
  jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
  criteria: [{ name: "产品发现", weight: 100, anchor: "" }]
});

assert.equal(incompleteCriterion.ok, false);
assert.match(incompleteCriterion.message, /评分锚点/);

const wrongWeightTotal = validateJobInput({
  title: "高级产品经理",
  jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
  criteria: [{ name: "产品发现", weight: 60, anchor: "验证客户问题。", approved: true }]
});

assert.equal(wrongWeightTotal.ok, false);
assert.match(wrongWeightTotal.message, /100%/);

const unapprovedCriterion = validateJobInput({
  title: "高级产品经理",
  jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
  criteria: [{ name: "产品发现", weight: 100, anchor: "验证客户问题。", approved: false }]
});

assert.equal(unapprovedCriterion.ok, false);
assert.match(unapprovedCriterion.message, /人工审批/);

const missingJd = validateJobInput({
  title: "高级产品经理",
  jd: "",
  criteria: [{ name: "产品发现", weight: 100, anchor: "验证客户问题。", approved: true }]
});

assert.equal(missingJd.ok, false);
assert.match(missingJd.message, /岗位 JD/);

console.log("job-validation.test.mjs passed");
