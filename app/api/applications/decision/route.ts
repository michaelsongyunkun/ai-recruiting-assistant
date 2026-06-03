import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

const allowedDecisions = new Set(["进入面试", "待补充信息", "暂不推进"]);

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.screeningRunId || !allowedDecisions.has(body.decision)) {
    return NextResponse.json(
      {
        ok: false,
        code: "DECISION_REQUIRED",
        message: "请选择有效的人工确认结果。"
      },
      { status: 400 }
    );
  }

  const decision = await createRecruitingStore().recordHumanDecision({
    screeningRunId: body.screeningRunId,
    decision: body.decision,
    reviewerName: body.reviewerName || "未命名审核人",
    note: body.note || ""
  });

  return NextResponse.json({ ok: true, decision });
}
