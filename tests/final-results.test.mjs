import assert from "node:assert/strict";
import {
  calculateFinalInterviewResult,
  classifyFinalScore,
  normalizeScoreToHundred
} from "../lib/domain/final-results.js";

assert.equal(normalizeScoreToHundred(3.2), 80);
assert.equal(normalizeScoreToHundred(92), 92);
assert.equal(normalizeScoreToHundred(120), 100);
assert.equal(normalizeScoreToHundred(""), null);

assert.equal(classifyFinalScore(88).decision, "推荐录用");
assert.equal(classifyFinalScore(78).decision, "建议推进");
assert.equal(classifyFinalScore(65).decision, "待补充评估");
assert.equal(classifyFinalScore(42).decision, "暂不通过");

assert.deepEqual(
  calculateFinalInterviewResult({
    resumeScore: 3,
    interviewScore: 90,
    resumeWeight: 40,
    interviewWeight: 60
  }),
  {
    resumeScore: 75,
    interviewScore: 90,
    finalScore: 84,
    decision: "建议推进",
    tone: "success",
    summary: "整体表现较好，建议进入下一轮或补充关键岗位问题。"
  }
);

assert.equal(
  calculateFinalInterviewResult({
    resumeScore: null,
    interviewScore: null
  }).decision,
  "待评分"
);

console.log("final-results.test.mjs passed");
