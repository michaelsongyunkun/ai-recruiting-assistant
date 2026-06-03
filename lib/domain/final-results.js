function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function clampScore(value, min = 0, max = 100) {
  const numberValue = toNumber(value);
  if (numberValue === null) return null;
  return Math.min(max, Math.max(min, numberValue));
}

export function normalizeScoreToHundred(value) {
  const score = clampScore(value);
  if (score === null) return null;
  return score <= 4 ? Math.round(score * 25) : Math.round(score);
}

export function classifyFinalScore(score) {
  const normalizedScore = clampScore(score);
  if (normalizedScore === null) {
    return {
      decision: "待评分",
      tone: "watch",
      summary: "请先完成简历初筛并输入面试得分。"
    };
  }

  if (normalizedScore >= 85) {
    return {
      decision: "推荐录用",
      tone: "success",
      summary: "简历证据和面试表现都达到录用线，可以进入 offer 或终面确认。"
    };
  }

  if (normalizedScore >= 75) {
    return {
      decision: "建议推进",
      tone: "success",
      summary: "整体表现较好，建议进入下一轮或补充关键岗位问题。"
    };
  }

  if (normalizedScore >= 60) {
    return {
      decision: "待补充评估",
      tone: "watch",
      summary: "有一定匹配度，但仍需要补充证据后再做最终决定。"
    };
  }

  return {
    decision: "暂不通过",
    tone: "blocked",
    summary: "综合表现低于当前岗位要求，建议暂不推进。"
  };
}

export function calculateFinalInterviewResult({
  resumeScore,
  interviewScore,
  resumeWeight = 40,
  interviewWeight = 60
}) {
  const normalizedResumeScore = normalizeScoreToHundred(resumeScore);
  const normalizedInterviewScore = normalizeScoreToHundred(interviewScore);
  const hasResumeScore = normalizedResumeScore !== null;
  const hasInterviewScore = normalizedInterviewScore !== null;

  if (!hasResumeScore && !hasInterviewScore) {
    return {
      resumeScore: null,
      interviewScore: null,
      finalScore: null,
      ...classifyFinalScore(null)
    };
  }

  const activeResumeWeight = hasResumeScore ? Number(resumeWeight) || 0 : 0;
  const activeInterviewWeight = hasInterviewScore ? Number(interviewWeight) || 0 : 0;
  const totalWeight = activeResumeWeight + activeInterviewWeight || 1;
  const weightedScore =
    ((normalizedResumeScore || 0) * activeResumeWeight +
      (normalizedInterviewScore || 0) * activeInterviewWeight) /
    totalWeight;
  const finalScore = Math.round(weightedScore);

  return {
    resumeScore: normalizedResumeScore,
    interviewScore: normalizedInterviewScore,
    finalScore,
    ...classifyFinalScore(finalScore)
  };
}
