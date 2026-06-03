import {
  productResumeDimensionWeights,
  productResumeRecommendations
} from "../ai/schemas.js";

const dimensionAliases = [
  ["方向", "匹配"],
  ["生命", "周期"],
  ["用户", "需求"],
  ["数据", "指标"],
  ["项目", "协作"],
  ["商业"],
  ["技术", "表达"],
  ["成长"]
];

const canonicalDimensions = [...productResumeDimensionWeights.entries()];

function stringValue(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text || fallback;
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stringValue(item)).filter(Boolean);
  }
  const text = stringValue(value);
  return text ? [text] : [];
}

function numberValue(value, fallback = 0) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function clampScore(value, max) {
  return Math.min(Math.max(Math.round(numberValue(value, 0)), 0), max);
}

function normalizeHardRequirementStatus(value) {
  const text = stringValue(value);
  if (/不适用|无关|N\/A/i.test(text)) return "不适用";
  if (/不满足|未满足|缺失|否|不符合/.test(text)) return "不满足";
  if (/信息不足|不确定|待确认|部分|有限|缺少|不足/.test(text)) return "信息不足";
  if (/满足|符合|是|有/.test(text)) return "满足";
  return "信息不足";
}

function normalizeInformationStatus(value) {
  const text = stringValue(value);
  if (/不足|缺少|缺失|待确认|不确定|有限/.test(text)) return "信息不足";
  return "证据充分";
}

function canonicalDimensionName(value, index) {
  const text = stringValue(value);
  const exact = canonicalDimensions.find(([name]) => name === text);
  if (exact) return exact[0];

  const aliasIndex = dimensionAliases.findIndex((tokens) => tokens.every((token) => text.includes(token)));
  if (aliasIndex >= 0) return canonicalDimensions[aliasIndex][0];

  return canonicalDimensions[index]?.[0] || text;
}

function recommendationFromScore(score) {
  if (score >= 85) return "强烈建议进入下一轮";
  if (score >= 70) return "建议进入下一轮";
  if (score >= 55) return "可作为备选";
  if (score >= 40) return "匹配度较低";
  return "暂不建议进入下一轮";
}

function normalizeRecommendation(value, score) {
  const text = stringValue(value);
  if (productResumeRecommendations.has(text) && text === recommendationFromScore(score)) return text;
  return recommendationFromScore(score);
}

function buildScoreReport(score) {
  const hardRequirementRows = score.hardRequirements
    .map((item) => `| ${item.requirement} | ${item.status} | ${item.evidence} |`)
    .join("\n");
  const dimensionRows = score.dimensions
    .map((item) => `| ${item.name} | ${item.weight} | ${item.score} | ${item.reason} |`)
    .join("\n");

  return [
    "【产品岗简历初筛评分】",
    "",
    `候选人：${score.candidateName}`,
    `目标岗位：${score.jobTitle}`,
    "",
    "一、硬性要求检查",
    "| 硬性要求 | 是否满足 | 依据 |",
    "|---|---|---|",
    hardRequirementRows,
    "",
    "二、评分明细",
    "| 评分维度 | 权重 | 得分 | 评分理由 |",
    "|---|---:|---:|---|",
    dimensionRows,
    "",
    "三、总分",
    `总分：${score.totalScore}/100`,
    "",
    "四、推荐等级",
    `推荐等级：${score.recommendationLevel}`,
    "",
    "五、主要匹配点",
    ...score.matchingPoints.map((item) => `- ${item}`),
    "",
    "六、主要风险或信息缺口",
    ...score.risksOrGaps.map((item) => `- ${item}`),
    "",
    "七、最终初筛建议",
    score.finalAdvice
  ].join("\n");
}

export function normalizeProductResumeScore(raw, { job, candidateProfile } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const dimensions = Array.isArray(raw.dimensions)
    ? raw.dimensions.map((item, index) => {
        const [canonicalName, canonicalWeight] = canonicalDimensions[index] || [
          stringValue(item?.name),
          numberValue(item?.weight, 0)
        ];
        const name = canonicalDimensionName(item?.name, index) || canonicalName;
        const weight = productResumeDimensionWeights.get(name) || canonicalWeight;
        return {
          name,
          weight,
          score: clampScore(item?.score, weight),
          reason: stringValue(item?.reason, "信息不足，模型未提供该维度评分理由。"),
          informationStatus: normalizeInformationStatus(item?.informationStatus)
        };
      })
    : [];

  const totalScore = dimensions.reduce((sum, item) => sum + item.score, 0);
  const normalized = {
    candidateName: stringValue(raw.candidateName, candidateProfile?.name || "未识别姓名"),
    jobTitle: stringValue(raw.jobTitle, job?.title || "未选择岗位"),
    hardRequirements: Array.isArray(raw.hardRequirements)
      ? raw.hardRequirements.map((item) => ({
          requirement: stringValue(item?.requirement, "未命名硬性要求"),
          status: normalizeHardRequirementStatus(item?.status),
          evidence: stringValue(item?.evidence, "信息不足")
        }))
      : [],
    dimensions,
    totalScore,
    recommendationLevel: normalizeRecommendation(raw.recommendationLevel, totalScore),
    matchingPoints: stringArray(raw.matchingPoints),
    risksOrGaps: stringArray(raw.risksOrGaps),
    finalAdvice: stringValue(raw.finalAdvice, "请招聘人员结合岗位优先级进行人工复核。"),
    reportMarkdown: stringValue(raw.reportMarkdown)
  };

  if (normalized.hardRequirements.length === 0) {
    normalized.hardRequirements.push({
      requirement: "岗位硬性要求",
      status: "信息不足",
      evidence: "模型未提供硬性要求检查结果。"
    });
  }
  if (normalized.matchingPoints.length === 0) normalized.matchingPoints.push("信息不足");
  if (normalized.risksOrGaps.length === 0) normalized.risksOrGaps.push("信息不足");
  if (!normalized.reportMarkdown) normalized.reportMarkdown = buildScoreReport(normalized);

  return normalized;
}
