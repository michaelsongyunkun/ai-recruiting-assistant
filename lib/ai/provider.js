import { validateSchema } from "./schemas.js";

function safeModelConfig(connection, workflow) {
  return {
    id: connection.id,
    provider: connection.provider,
    baseUrl: connection.baseUrl,
    model: connection.model,
    credentialId: connection.credentialId,
    workflow
  };
}

function findActiveConnection({ organizationId, workflow, connections = [] }) {
  return connections.find(
    (connection) =>
      connection.organizationId === organizationId &&
      connection.status === "verified" &&
      Array.isArray(connection.workflows) &&
      connection.workflows.includes(workflow)
  );
}

function isDemoConnection(connection) {
  const provider = String(connection?.provider || "").toLowerCase();
  const baseUrl = String(connection?.baseUrl || "").toLowerCase();
  return provider.includes("mock") || baseUrl.startsWith("mock://");
}

function chatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || "").replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function extractBalancedJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = inString;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return "";
}

function parseJsonContent(content) {
  if (content && typeof content === "object") return content;
  const text = String(content || "").trim();
  const withoutFence = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    const embeddedJson = extractBalancedJsonObject(withoutFence);
    if (!embeddedJson) throw error;
    return JSON.parse(embeddedJson);
  }
}

async function callConfiguredProvider({ connection, system, user, fetchImpl }) {
  if (!connection?.apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }
  if (isDemoConnection(connection)) {
    throw new Error("MODEL_DEMO_PROVIDER_DISABLED");
  }

  const requestFetch = fetchImpl || globalThis.fetch;
  if (typeof requestFetch !== "function") {
    throw new Error("FETCH_UNAVAILABLE");
  }

  const response = await requestFetch(chatCompletionsUrl(connection.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.apiKey}`
    },
    body: JSON.stringify({
      model: connection.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = payload.error?.message || payload.message || `HTTP ${response.status}`;
    throw new Error(`MODEL_PROVIDER_ERROR: ${providerMessage}`);
  }

  return parseJsonContent(
    payload.choices?.[0]?.message?.content ?? payload.output_text ?? payload.content
  );
}

export async function testModelConnection({ connection, fetchImpl = null }) {
  const startedAt = Date.now();
  try {
    await callConfiguredProvider({
      connection,
      system: "Return only valid JSON.",
      user: 'Return {"ok":true}.',
      fetchImpl
    });
    return {
      ok: true,
      status: "verified",
      latencyMs: Date.now() - startedAt,
      message: "模型 API 连接验证成功。"
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      message: `模型 API 连接失败：${error.message}`
    };
  }
}

export async function generateJson({
  organizationId,
  workflow,
  system,
  user,
  schemaName,
  connections = [],
  fetchImpl = null
}) {
  const connection = findActiveConnection({ organizationId, workflow, connections });
  if (!connection) {
    return {
      ok: false,
      code: "USER_API_CONNECTION_REQUIRED",
      message: "请先连接并验证企业自己的模型 API，再运行该 AI 流程。"
    };
  }

  let raw;
  try {
    raw = await callConfiguredProvider({ connection, system, user, fetchImpl });
  } catch (error) {
    return {
      ok: false,
      code: "MODEL_PROVIDER_CALL_FAILED",
      message: "模型 API 调用失败，请检查接口地址、模型名称、API Key 和网络状态。",
      error: error.message,
      modelConfig: safeModelConfig(connection, workflow)
    };
  }

  const validation = validateSchema(schemaName, raw);
  if (!validation.valid) {
    return {
      ok: false,
      code: "MODEL_OUTPUT_VALIDATION_FAILED",
      message: "模型输出不符合要求的结构。",
      errors: validation.errors,
      raw,
      modelConfig: safeModelConfig(connection, workflow)
    };
  }

  return {
    ok: true,
    parsed: raw,
    raw,
    modelConfig: safeModelConfig(connection, workflow)
  };
}
