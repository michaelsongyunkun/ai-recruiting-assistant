const recommendationLabels = new Set([
  "strong_review",
  "review",
  "needs_more_information",
  "not_enough_evidence"
]);

const confidenceLabels = new Set(["high", "medium", "low"]);
const interviewTypes = new Set(["recruiter_screen", "technical", "behavioral", "hiring_manager"]);
export const productResumeRecommendations = new Set([
  "强烈建议进入下一轮",
  "建议进入下一轮",
  "可作为备选",
  "匹配度较低",
  "暂不建议进入下一轮"
]);
export const productResumeDimensionWeights = new Map([
  ["产品岗位方向匹配度", 20],
  ["产品全生命周期能力", 18],
  ["用户洞察与需求分析能力", 12],
  ["数据分析与指标驱动能力", 15],
  ["项目推进与跨团队协作能力", 12],
  ["商业理解与业务结果", 10],
  ["技术理解与产品表达能力", 8],
  ["成长潜力与职业连贯性", 5]
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isString(value) {
  return typeof value === "string";
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateObjectArray(value, keys, requiredStringKeys, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const item of value) {
    if (!isObject(item)) {
      errors.push(`${label} item must be an object`);
      continue;
    }
    if (!hasOnlyKeys(item, keys)) {
      errors.push(`${label} item contains unknown keys`);
    }
    for (const key of requiredStringKeys) {
      if (!isString(item[key])) {
        errors.push(`${label}.${key} must be a string`);
      }
    }
    for (const key of keys) {
      if (Array.isArray(item[key]) && !isStringArray(item[key])) {
        errors.push(`${label}.${key} must be a string array`);
      }
    }
  }
}

export function validateResumeProfileShape(value) {
  const errors = [];
  if (!isObject(value)) return { valid: false, errors: ["output must be an object"] };

  const allowedKeys = [
    "name",
    "email",
    "phone",
    "location",
    "workHistory",
    "skills",
    "education",
    "certifications",
    "projects",
    "unsupportedClaims",
    "protectedTraitsInferred",
    "parsingNotes"
  ];
  if (!hasOnlyKeys(value, allowedKeys)) {
    errors.push("resume profile contains unknown keys");
  }

  for (const key of ["name", "email", "phone", "location"]) {
    if (!isString(value[key])) errors.push(`${key} must be a string`);
  }

  validateObjectArray(
    value.workHistory,
    ["title", "company", "startDate", "endDate", "responsibilities", "achievements", "evidence"],
    ["title", "company", "startDate", "endDate", "evidence"],
    "workHistory",
    errors
  );
  for (const item of value.workHistory || []) {
    if (!isStringArray(item.responsibilities)) errors.push("workHistory.responsibilities must be a string array");
    if (!isStringArray(item.achievements)) errors.push("workHistory.achievements must be a string array");
  }
  validateObjectArray(value.skills, ["name", "evidence"], ["name", "evidence"], "skills", errors);
  validateObjectArray(value.education, ["institution", "credential", "date", "evidence"], ["institution", "credential", "date", "evidence"], "education", errors);
  validateObjectArray(value.certifications, ["name", "issuer", "date", "evidence"], ["name", "issuer", "date", "evidence"], "certifications", errors);
  validateObjectArray(value.projects, ["name", "role", "summary", "evidence"], ["name", "role", "summary", "evidence"], "projects", errors);

  if (!isStringArray(value.unsupportedClaims)) errors.push("unsupportedClaims must be a string array");
  if (typeof value.protectedTraitsInferred !== "boolean") errors.push("protectedTraitsInferred must be a boolean");
  if (!isStringArray(value.parsingNotes)) errors.push("parsingNotes must be a string array");

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateProductResumeScoreShape(value) {
  const errors = [];
  if (!isObject(value)) return { valid: false, errors: ["output must be an object"] };
  const allowedKeys = [
    "candidateName",
    "jobTitle",
    "hardRequirements",
    "dimensions",
    "totalScore",
    "recommendationLevel",
    "matchingPoints",
    "risksOrGaps",
    "finalAdvice",
    "reportMarkdown"
  ];

  if (!hasOnlyKeys(value, allowedKeys)) errors.push("product resume score contains unknown keys");
  for (const key of ["candidateName", "jobTitle", "recommendationLevel", "finalAdvice", "reportMarkdown"]) {
    if (!isString(value[key]) || value[key].trim() === "") errors.push(`${key} must be a non-empty string`);
  }
  if (!productResumeRecommendations.has(value.recommendationLevel)) {
    errors.push("recommendationLevel is invalid");
  }
  if (typeof value.totalScore !== "number" || value.totalScore < 0 || value.totalScore > 100) {
    errors.push("totalScore must be a number from 0 to 100");
  }

  validateObjectArray(
    value.hardRequirements,
    ["requirement", "status", "evidence"],
    ["requirement", "status", "evidence"],
    "hardRequirements",
    errors
  );
  for (const item of value.hardRequirements || []) {
    if (!["满足", "不满足", "信息不足", "不适用"].includes(item.status)) {
      errors.push("hardRequirements.status is invalid");
    }
  }

  if (!Array.isArray(value.dimensions)) {
    errors.push("dimensions must be an array");
  } else {
    if (value.dimensions.length !== productResumeDimensionWeights.size) {
      errors.push("dimensions must include exactly 8 scoring dimensions");
    }
    const total = value.dimensions.reduce((sum, item) => sum + (typeof item.score === "number" ? item.score : 0), 0);
    for (const item of value.dimensions) {
      if (!isObject(item)) {
        errors.push("dimension item must be an object");
        continue;
      }
      if (!hasOnlyKeys(item, ["name", "weight", "score", "reason", "informationStatus"])) {
        errors.push("dimension item contains unknown keys");
      }
      if (!productResumeDimensionWeights.has(item.name)) {
        errors.push(`${item.name || "dimension"} is not a supported scoring dimension`);
      }
      const expectedWeight = productResumeDimensionWeights.get(item.name);
      if (item.weight !== expectedWeight) {
        errors.push(`${item.name || "dimension"} weight must be ${expectedWeight}`);
      }
      if (typeof item.score !== "number" || item.score < 0 || item.score > (expectedWeight || 0)) {
        errors.push(`${item.name || "dimension"} score is out of range`);
      }
      if (!isString(item.reason) || item.reason.trim() === "") errors.push(`${item.name || "dimension"} reason is required`);
      if (!["证据充分", "信息不足"].includes(item.informationStatus)) {
        errors.push(`${item.name || "dimension"} informationStatus is invalid`);
      }
    }
    if (Math.abs(total - value.totalScore) > 1) {
      errors.push("totalScore must equal the sum of dimension scores");
    }
  }

  if (!isStringArray(value.matchingPoints)) errors.push("matchingPoints must be a string array");
  if (!isStringArray(value.risksOrGaps)) errors.push("risksOrGaps must be a string array");

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateScreeningRecommendationShape(value) {
  const errors = [];
  if (!isObject(value)) return { valid: false, errors: ["output must be an object"] };

  if (!hasOnlyKeys(value, ["overallRecommendation", "overallScore", "summary", "criteria", "reviewerChecklist"])) {
    errors.push("screening output contains unknown keys");
  }
  if (!recommendationLabels.has(value.overallRecommendation)) {
    errors.push("overallRecommendation is invalid");
  }
  if (typeof value.overallScore !== "number" || value.overallScore < 0 || value.overallScore > 4) {
    errors.push("overallScore must be a number from 0 to 4");
  }
  if (typeof value.summary !== "string" || value.summary.trim() === "") {
    errors.push("summary is required");
  }
  if (!Array.isArray(value.criteria)) {
    errors.push("criteria must be an array");
  } else {
    for (const criterion of value.criteria) {
      if (!isObject(criterion)) {
        errors.push("criterion must be an object");
        continue;
      }
      if (
        !hasOnlyKeys(criterion, [
          "criterionId",
          "score",
          "confidence",
          "evidence",
          "missingInformation",
          "riskFlags"
        ])
      ) {
        errors.push(`${criterion.criterionId || "criterion"} contains unknown keys`);
      }
      if (typeof criterion.criterionId !== "string" || criterion.criterionId.trim() === "") {
        errors.push("criterionId is required");
      }
      if (![0, 1, 2, 3, 4].includes(criterion.score)) {
        errors.push(`${criterion.criterionId || "criterion"} score must be 0 through 4`);
      }
      if (!confidenceLabels.has(criterion.confidence)) {
        errors.push(`${criterion.criterionId || "criterion"} confidence is invalid`);
      }
      for (const key of ["evidence", "missingInformation", "riskFlags"]) {
        if (!Array.isArray(criterion[key]) || !criterion[key].every((item) => typeof item === "string")) {
          errors.push(`${criterion.criterionId || "criterion"} ${key} must be a string array`);
        }
      }
    }
  }
  if (!Array.isArray(value.reviewerChecklist)) {
    errors.push("reviewerChecklist must be an array");
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateInterviewGuideShape(value) {
  const errors = [];
  if (!isObject(value)) return { valid: false, errors: ["output must be an object"] };

  if ("questionCount" in value || "evidenceBasis" in value || "scoringSheet" in value) {
    const allowedKeys = [
      "candidateName",
      "jobTitle",
      "questionCount",
      "evidenceBasis",
      "interviewType",
      "questions",
      "scoringMethod",
      "scoringSheet",
      "recommendationLevel",
      "conclusionSummary",
      "reportMarkdown"
    ];

    if (!hasOnlyKeys(value, allowedKeys)) errors.push("interview guide contains unknown keys");
    for (const key of [
      "candidateName",
      "jobTitle",
      "evidenceBasis",
      "interviewType",
      "scoringMethod",
      "recommendationLevel",
      "conclusionSummary",
      "reportMarkdown"
    ]) {
      if (typeof value[key] !== "string" || value[key].trim() === "") errors.push(`${key} is required`);
    }
    if (value.interviewType !== "hiring_manager") errors.push("interviewType must be hiring_manager");
    if (!Number.isInteger(value.questionCount) || value.questionCount < 3 || value.questionCount > 8) {
      errors.push("questionCount must be an integer from 3 to 8");
    }

    if (!Array.isArray(value.questions)) {
      errors.push("questions must be an array");
    } else {
      if (Number.isInteger(value.questionCount) && value.questions.length !== value.questionCount) {
        errors.push("questions length must equal questionCount");
      }
      const weightTotal = value.questions.reduce((sum, question) => {
        const weight = typeof question?.weight === "number" ? question.weight : 0;
        return sum + weight;
      }, 0);
      if (Math.abs(weightTotal - 100) > 0.001) errors.push("question weights must sum to 100");

      for (const question of value.questions) {
        if (!isObject(question)) {
          errors.push("question must be an object");
          continue;
        }
        if (
          !hasOnlyKeys(question, [
            "sequence",
            "question",
            "questionType",
            "dimension",
            "evidence",
            "weight",
            "score5",
            "score3",
            "score1"
          ])
        ) {
          errors.push("question contains unknown keys");
        }
        if (!Number.isInteger(question.sequence) || question.sequence < 1) errors.push("question.sequence is invalid");
        if (typeof question.weight !== "number" || question.weight <= 0 || question.weight > 100) {
          errors.push("question.weight is invalid");
        }
        for (const key of ["question", "questionType", "dimension", "evidence", "score5", "score3", "score1"]) {
          if (typeof question[key] !== "string" || question[key].trim() === "") {
            errors.push(`${key} is required`);
          }
        }
      }
    }

    if (!Array.isArray(value.scoringSheet)) {
      errors.push("scoringSheet must be an array");
    } else {
      if (Number.isInteger(value.questionCount) && value.scoringSheet.length !== value.questionCount) {
        errors.push("scoringSheet length must equal questionCount");
      }
      for (const row of value.scoringSheet) {
        if (!isObject(row)) {
          errors.push("scoringSheet row must be an object");
          continue;
        }
        if (!hasOnlyKeys(row, ["sequence", "weight", "interviewerScore", "weightedScore"])) {
          errors.push("scoringSheet row contains unknown keys");
        }
        if (!Number.isInteger(row.sequence) || row.sequence < 1) errors.push("scoringSheet.sequence is invalid");
        if (typeof row.weight !== "number" || row.weight <= 0 || row.weight > 100) {
          errors.push("scoringSheet.weight is invalid");
        }
        if (
          row.interviewerScore !== null &&
          (typeof row.interviewerScore !== "number" || row.interviewerScore < 0 || row.interviewerScore > 5)
        ) {
          errors.push("scoringSheet.interviewerScore must be null or 0 through 5");
        }
        if (
          row.weightedScore !== null &&
          (typeof row.weightedScore !== "number" || row.weightedScore < 0 || row.weightedScore > 100)
        ) {
          errors.push("scoringSheet.weightedScore must be null or 0 through 100");
        }
      }
    }

    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
  }

  if (!hasOnlyKeys(value, ["interviewType", "openingScript", "questions", "candidateSpecificClarifications"])) {
    errors.push("interview guide contains unknown keys");
  }
  if (!interviewTypes.has(value.interviewType)) errors.push("interviewType is invalid");
  if (typeof value.openingScript !== "string" || value.openingScript.trim() === "") {
    errors.push("openingScript is required");
  }
  if (!Array.isArray(value.questions)) {
    errors.push("questions must be an array");
  } else {
    for (const question of value.questions) {
      if (!isObject(question)) {
        errors.push("question must be an object");
        continue;
      }
      for (const key of ["criterionId", "question", "strongSignal", "weakSignal"]) {
        if (typeof question[key] !== "string" || question[key].trim() === "") {
          errors.push(`${key} is required`);
        }
      }
      if (!Array.isArray(question.followUps)) errors.push("followUps must be an array");
    }
  }
  if (!Array.isArray(value.candidateSpecificClarifications)) {
    errors.push("candidateSpecificClarifications must be an array");
  }
  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateInterviewSummaryShape(value) {
  const errors = [];
  if (!isObject(value)) return { valid: false, errors: ["output must be an object"] };
  if (
    !hasOnlyKeys(value, [
      "summary",
      "citedNoteIds",
      "introducesNewClaims",
      "finalInterviewScore",
      "recommendationLevel",
      "scoringSheet",
      "hiringSignals",
      "followUpRisks"
    ])
  ) {
    errors.push("interview summary contains unknown keys");
  }
  if (typeof value.summary !== "string" || value.summary.trim() === "") {
    errors.push("summary is required");
  }
  if (!Array.isArray(value.citedNoteIds) || !value.citedNoteIds.every((item) => typeof item === "string")) {
    errors.push("citedNoteIds must be a string array");
  }
  if (value.citedNoteIds?.length === 0) {
    errors.push("summary must cite interviewer notes");
  }
  if (typeof value.introducesNewClaims !== "boolean") {
    errors.push("introducesNewClaims must be a boolean");
  }
  if (value.introducesNewClaims === true) {
    errors.push("summary must not introduce new claims");
  }
  if (
    value.finalInterviewScore !== undefined &&
    (typeof value.finalInterviewScore !== "number" || value.finalInterviewScore < 0 || value.finalInterviewScore > 100)
  ) {
    errors.push("finalInterviewScore must be a number from 0 to 100");
  }
  if (
    value.recommendationLevel !== undefined &&
    ![
      "强烈建议进入下一轮",
      "建议进入下一轮",
      "可作为备选",
      "匹配度较低",
      "暂不建议进入下一轮"
    ].includes(value.recommendationLevel)
  ) {
    errors.push("recommendationLevel is invalid");
  }
  if (value.scoringSheet !== undefined) {
    if (!Array.isArray(value.scoringSheet)) {
      errors.push("scoringSheet must be an array");
    } else {
      for (const row of value.scoringSheet) {
        if (!isObject(row)) {
          errors.push("scoringSheet row must be an object");
          continue;
        }
        if (!hasOnlyKeys(row, ["sequence", "weight", "interviewerScore", "weightedScore", "scoringReason"])) {
          errors.push("scoringSheet row contains unknown keys");
        }
        if (!Number.isInteger(row.sequence) || row.sequence < 1) errors.push("scoringSheet.sequence is invalid");
        if (typeof row.weight !== "number" || row.weight <= 0 || row.weight > 100) {
          errors.push("scoringSheet.weight is invalid");
        }
        if (typeof row.interviewerScore !== "number" || row.interviewerScore < 0 || row.interviewerScore > 5) {
          errors.push("scoringSheet.interviewerScore must be 0 through 5");
        }
        if (typeof row.weightedScore !== "number" || row.weightedScore < 0 || row.weightedScore > 100) {
          errors.push("scoringSheet.weightedScore must be 0 through 100");
        }
        if (typeof row.scoringReason !== "string" || row.scoringReason.trim() === "") {
          errors.push("scoringSheet.scoringReason is required");
        }
      }
    }
  }
  for (const key of ["hiringSignals", "followUpRisks"]) {
    if (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === "string")) {
      errors.push(`${key} must be a string array`);
    }
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function validateSchema(schemaName, value) {
  if (schemaName === "resumeProfile") return validateResumeProfileShape(value);
  if (schemaName === "productResumeScore") return validateProductResumeScoreShape(value);
  if (schemaName === "screeningRecommendation") return validateScreeningRecommendationShape(value);
  if (schemaName === "interviewGuide") return validateInterviewGuideShape(value);
  if (schemaName === "interviewSummary") return validateInterviewSummaryShape(value);
  return { valid: false, errors: [`unknown schema ${schemaName}`] };
}
