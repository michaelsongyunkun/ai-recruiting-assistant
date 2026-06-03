import { NextResponse } from "next/server";
import { computeSelectionRates } from "../../../../lib/audit/fairness-metrics.js";
import { demoFairnessRows } from "../../../../lib/domain/demo-data.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function GET() {
  const store = createRecruitingStore();
  const snapshot = await store.getPublicSnapshot();

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    jobs: snapshot.jobs,
    candidates: snapshot.candidates,
    screeningRuns: snapshot.screeningRuns,
    humanDecisions: snapshot.humanDecisions,
    auditEvents: snapshot.auditEvents,
    modelConfigs: snapshot.modelConnections.map((connection: any) => ({
      id: connection.id,
      provider: connection.provider,
      baseUrl: connection.baseUrl,
      model: connection.model,
      credentialId: connection.credentialId,
      workflows: connection.workflows,
      status: connection.status,
      keyPreview: connection.keyPreview,
      lastTestedAt: connection.lastTestedAt
    })),
    fairnessSnapshot: computeSelectionRates(demoFairnessRows),
    notes: [
      "审计导出不包含原始或加密 API Key。",
      "选择率群组只使用候选人自愿提供的人口统计数据。"
    ]
  });
}
