import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../../../lib/server/recruiting-store.js";

export async function POST(request: Request, context: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await context.params;
  const body = await request.json();
  const store = createRecruitingStore();
  const snapshot = await store.getSnapshot();
  const summary =
    snapshot.interviewSummaries.find((item: any) => item.id === body.interviewSummaryId) ||
    snapshot.interviewSummaries.find((item: any) => item.interviewGuideId === interviewId);

  if (!summary) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_SUMMARY_NOT_FOUND",
        message: "请先生成面试总结，再人工确认。"
      },
      { status: 404 }
    );
  }

  const confirmation = await store.confirmInterviewSummary({
    interviewSummaryId: summary.id,
    reviewerName: body.reviewerName || "HR",
    decision: body.decision || "建议推进下一轮",
    note: body.note || ""
  });

  return NextResponse.json({ ok: true, confirmation });
}
