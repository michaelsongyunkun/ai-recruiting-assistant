import { generateJson } from "../ai/provider.js";
import { validateSchema } from "../ai/schemas.js";
import {
  buildProductResumeScoringUserPrompt,
  PRODUCT_RESUME_SCORING_SYSTEM_PROMPT,
  PROMPT_VERSIONS
} from "../ai/prompts.js";
import { normalizeProductResumeScore } from "./product-resume-score-normalizer.js";

function statusForAiResult(result) {
  if (result.code === "USER_API_CONNECTION_REQUIRED") return 400;
  if (result.code === "MODEL_OUTPUT_VALIDATION_FAILED") return 422;
  return 502;
}

const RETRYABLE_SCORING_CODES = new Set(["MODEL_OUTPUT_VALIDATION_FAILED", "MODEL_PROVIDER_CALL_FAILED"]);

function shouldRetryScoring(result, attempt, maxAttempts) {
  return !result.ok && attempt < maxAttempts && RETRYABLE_SCORING_CODES.has(result.code);
}

function buildRetryUserPrompt(basePrompt, result, attempt) {
  const retryContext = {
    attempt,
    code: result.code,
    message: result.message,
    errors: result.errors || [],
    requiredAction:
      "请重新生成一次评分结果。必须只返回符合 schema 的 JSON，不要添加 markdown 代码块或额外解释；totalScore 必须等于 8 个维度得分之和。"
  };
  return [
    basePrompt,
    "上一次产品岗简历评分输出未通过系统校验，请根据以下错误修正后重新输出。",
    JSON.stringify(retryContext, null, 2)
  ].join("\n\n");
}

function normalizeInvalidScoringOutput(result, { job, candidateProfile }) {
  if (result.code !== "MODEL_OUTPUT_VALIDATION_FAILED" || !result.raw) return null;

  const normalized = normalizeProductResumeScore(result.raw, { job, candidateProfile });
  const validation = validateSchema("productResumeScore", normalized);
  if (!validation.valid) return null;

  return {
    ok: true,
    score: normalized,
    modelConfig: {
      ...result.modelConfig,
      promptVersion: PROMPT_VERSIONS.productResumeScoring,
      normalizedModelOutput: true
    }
  };
}

export async function scoreProductManagerResume({
  store,
  organizationId = "org_demo",
  job,
  candidateProfile,
  generateJsonImpl = generateJson,
  maxAttempts = 2
}) {
  const connection = await store.getActiveModelConnection({
    organizationId,
    workflow: "productResumeScoring"
  });

  if (!connection) {
    return {
      ok: false,
      status: 400,
      code: "PRODUCT_RESUME_SCORING_API_REQUIRED",
      message: "请先在模型 API 设置中连接并验证 DeepSeek，然后勾选“产品岗简历评分”。"
    };
  }

  if (!job) {
    return {
      ok: false,
      status: 400,
      code: "TARGET_JOB_REQUIRED",
      message: "请先选择目标岗位，再运行产品岗简历评分。"
    };
  }

  const baseUserPrompt = buildProductResumeScoringUserPrompt({ job, candidateProfile });
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await generateJsonImpl({
      organizationId,
      workflow: "productResumeScoring",
      system: PRODUCT_RESUME_SCORING_SYSTEM_PROMPT,
      user: attempt === 1 ? baseUserPrompt : buildRetryUserPrompt(baseUserPrompt, lastResult, attempt),
      schemaName: "productResumeScore",
      connections: [connection]
    });

    if (result.ok) {
      return {
        ok: true,
        score: result.parsed,
        modelConfig: {
          ...result.modelConfig,
          promptVersion: PROMPT_VERSIONS.productResumeScoring
        }
      };
    }

    const normalizedResult = normalizeInvalidScoringOutput(result, { job, candidateProfile });
    if (normalizedResult) return normalizedResult;

    lastResult = result;
    if (!shouldRetryScoring(result, attempt, maxAttempts)) {
      return {
        ...result,
        status: statusForAiResult(result)
      };
    }
  }

  return {
    ...lastResult,
    status: statusForAiResult(lastResult)
  };
}
