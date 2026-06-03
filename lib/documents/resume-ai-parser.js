import { generateJson } from "../ai/provider.js";
import {
  buildResumeParserUserPrompt,
  buildSystemPrompt,
  PROMPT_VERSIONS
} from "../ai/prompts.js";

function statusForAiResult(result) {
  if (result.code === "USER_API_CONNECTION_REQUIRED") return 400;
  if (result.code === "MODEL_OUTPUT_VALIDATION_FAILED") return 422;
  return 502;
}

export async function parseResumeWithDeepSeek({
  store,
  organizationId = "org_demo",
  fileName,
  resumeText
}) {
  const connection = await store.getActiveModelConnection({
    organizationId,
    workflow: "resumeParser"
  });

  if (!connection) {
    return {
      ok: false,
      status: 400,
      code: "RESUME_PARSER_API_REQUIRED",
      message: "请先在模型 API 设置中连接并验证 DeepSeek，然后勾选“简历解析（DeepSeek）”。"
    };
  }

  const result = await generateJson({
    organizationId,
    workflow: "resumeParser",
    system: buildSystemPrompt("resumeParser"),
    user: buildResumeParserUserPrompt({ fileName, resumeText }),
    schemaName: "resumeProfile",
    connections: [connection]
  });

  if (!result.ok) {
    return {
      ...result,
      status: statusForAiResult(result)
    };
  }

  return {
    ok: true,
    profile: result.parsed,
    modelConfig: {
      ...result.modelConfig,
      promptVersion: PROMPT_VERSIONS.resumeParser
    }
  };
}
