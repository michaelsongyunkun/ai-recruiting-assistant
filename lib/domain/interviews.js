export function canGenerateInterviewAi({ hasVerifiedUserApiConnection }) {
  if (!hasVerifiedUserApiConnection) {
    return {
      ok: false,
      code: "USER_API_CONNECTION_REQUIRED",
      message: "请先连接并验证企业自己的模型 API，再使用面试 AI。"
    };
  }
  return { ok: true };
}

export function validateInterviewGuide(guide, criteria) {
  const errors = [];

  if ("questionCount" in guide || "scoringSheet" in guide) {
    if (!Number.isInteger(guide.questionCount) || guide.questionCount < 3 || guide.questionCount > 8) {
      errors.push("questionCount must be 3 through 8");
    }
    if (!Array.isArray(guide.questions) || guide.questions.length !== guide.questionCount) {
      errors.push("questions length must equal questionCount");
    }
    const totalWeight = (guide.questions || []).reduce(
      (sum, question) => sum + (typeof question.weight === "number" ? question.weight : 0),
      0
    );
    if (Math.abs(totalWeight - 100) > 0.001) {
      errors.push("question weights must sum to 100");
    }
    if (!Array.isArray(guide.scoringSheet) || guide.scoringSheet.length !== guide.questionCount) {
      errors.push("scoringSheet length must equal questionCount");
    }
    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
  }

  const approvedCriteria = new Set(criteria.filter((criterion) => criterion.approved).map((criterion) => criterion.id));

  for (const question of guide.questions || []) {
    if (!approvedCriteria.has(question.criterionId)) {
      errors.push(`${question.criterionId} must map to an approved criterion`);
    }
    if (!question.strongSignal || !question.weakSignal) {
      errors.push(`${question.criterionId} must include strong and weak signal guidance`);
    }
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateInterviewSummary(summary) {
  const errors = [];
  if (!Array.isArray(summary.citedNoteIds) || summary.citedNoteIds.length === 0) {
    errors.push("summary must cite interviewer notes");
  }
  if (summary.introducesNewClaims) {
    errors.push("summary must not introduce new claims");
  }
  if (!summary.summary || summary.summary.trim() === "") {
    errors.push("summary text is required");
  }
  if (
    summary.finalInterviewScore !== undefined &&
    (typeof summary.finalInterviewScore !== "number" || summary.finalInterviewScore < 0 || summary.finalInterviewScore > 100)
  ) {
    errors.push("finalInterviewScore must be 0 through 100");
  }
  if (summary.scoringSheet !== undefined && !Array.isArray(summary.scoringSheet)) {
    errors.push("scoringSheet must be an array");
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}
