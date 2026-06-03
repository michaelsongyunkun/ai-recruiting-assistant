import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../../../lib/server/recruiting-store.js";

export async function POST(request: Request, context: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await context.params;
  const body = await request.json();
  const content = String(body.content || "").trim();

  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_NOTE_REQUIRED",
        message: "请先填写面试笔记。"
      },
      { status: 400 }
    );
  }

  try {
    const store = createRecruitingStore();
    const note = await store.addInterviewNote({
      interviewGuideId: interviewId,
      authorName: body.authorName || "面试官",
      content
    });

    return NextResponse.json({ ok: true, note });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: error.message || "INTERVIEW_NOTE_SAVE_FAILED",
        message: "保存面试笔记失败。"
      },
      { status: 404 }
    );
  }
}
