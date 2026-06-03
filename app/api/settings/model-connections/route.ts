import { NextResponse } from "next/server";
import { testModelConnection } from "../../../../lib/ai/provider.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

function isDemoModelConnection(provider: string, baseUrl: string) {
  return provider.toLowerCase().includes("mock") || baseUrl.toLowerCase().startsWith("mock://");
}

export async function GET() {
  const store = createRecruitingStore();
  const connections = await store.getPublicModelConnections();
  return NextResponse.json({
    ok: true,
    connections
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = String(body.apiKey || "").trim();
  const provider = String(body.provider || "openai-compatible").trim();
  const baseUrl = String(body.baseUrl || "").trim();
  const model = String(body.model || "").trim();

  if (!provider || !baseUrl || !model || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "MODEL_CONNECTION_FIELDS_REQUIRED",
        message: "请填写服务商、接口地址、模型名称和企业自己的 API Key。"
      },
      { status: 400 }
    );
  }

  if (isDemoModelConnection(provider, baseUrl)) {
    return NextResponse.json(
      {
        ok: false,
        code: "MODEL_DEMO_PROVIDER_DISABLED",
        message: "已禁用本地模拟模型。请提交企业自己的 API Key 后再启用生成功能。"
      },
      { status: 400 }
    );
  }

  const store = createRecruitingStore();
  const connectionInput = {
    connectionId: body.connectionId,
    organizationId: body.organizationId || "org_demo",
    provider,
    baseUrl,
    model,
    apiKey,
    workflows: body.workflows || ["resumeParser", "productResumeScoring", "screening", "interviewGuide", "interviewSummary"],
    createdByUserId: body.createdByUserId || "user_demo"
  };

  const action = body.action || "saveAndTest";
  const shouldTest = action !== "save";
  const testedAt = shouldTest ? new Date().toISOString() : null;
  const test = shouldTest
    ? await testModelConnection({
        connection: {
          id: "model_connection_test",
          organizationId: connectionInput.organizationId,
          provider,
          baseUrl,
          model,
          workflows: connectionInput.workflows,
          status: "verified",
          credentialId: "credential_test",
          apiKey
        }
      })
    : {
        ok: true,
        status: "unverified",
        latencyMs: 0,
        message: "连接已保存，尚未验证。"
      };

  const connection = await store.saveModelConnection({
    ...connectionInput,
    status: shouldTest ? test.status : "unverified",
    lastTestedAt: testedAt,
    lastTestMessage: test.message
  });

  return NextResponse.json({
    ok: !shouldTest || test.ok,
    connection,
    test
  }, { status: !shouldTest || test.ok ? 200 : 502 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const connectionId = String(body.connectionId || "").trim();

  if (!connectionId) {
    return NextResponse.json(
      {
        ok: false,
        code: "MODEL_CONNECTION_ID_REQUIRED",
        message: "请提供要删除的模型 API 连接。"
      },
      { status: 400 }
    );
  }

  try {
    const deletedConnection = await createRecruitingStore().deleteModelConnection(connectionId);
    return NextResponse.json({ ok: true, deletedConnection });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: error.message || "MODEL_CONNECTION_DELETE_FAILED",
        message: "删除模型 API 连接失败。"
      },
      { status: 404 }
    );
  }
}
