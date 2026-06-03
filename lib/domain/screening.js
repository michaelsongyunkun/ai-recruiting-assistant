export function validateScreeningRecommendation(input) {
  const errors = [];

  for (const criterion of input.criteria || []) {
    const hasEvidence = Array.isArray(criterion.evidence) && criterion.evidence.length > 0;
    const hasMissingInfo =
      Array.isArray(criterion.missingInformation) && criterion.missingInformation.length > 0;
    if (!hasEvidence && !hasMissingInfo) {
      errors.push(`${criterion.criterionId} requires evidence or missing information`);
    }
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function canRunScreening({ rubricApproved, hasResumeUploaded, hasVerifiedUserApiConnection }) {
  if (!rubricApproved) {
    return {
      ok: false,
      code: "RUBRIC_APPROVAL_REQUIRED",
      message: "请先审批岗位评分标准，再运行初筛。"
    };
  }

  if (!hasResumeUploaded) {
    return {
      ok: false,
      code: "RESUME_UPLOAD_REQUIRED",
      message: "请先上传并解析候选人简历，再运行初筛。"
    };
  }

  if (!hasVerifiedUserApiConnection) {
    return {
      ok: false,
      code: "USER_API_CONNECTION_REQUIRED",
      message: "请先连接并验证企业自己的模型 API，再运行初筛。"
    };
  }

  return { ok: true };
}

export function summarizeScreeningResult(result) {
  const criteria = result.criteria || [];
  return {
    overallRecommendation: result.overallRecommendation,
    overallScore: result.overallScore,
    evidenceCount: criteria.filter((criterion) => criterion.evidence?.length > 0).length,
    missingInformationCount: criteria.filter((criterion) => criterion.missingInformation?.length > 0)
      .length,
    highConfidenceCount: criteria.filter((criterion) => criterion.confidence === "high").length
  };
}
