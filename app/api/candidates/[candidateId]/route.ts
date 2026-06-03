import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function DELETE(_request: Request, context: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await context.params;

  try {
    const deletedCandidate = await createRecruitingStore().deleteCandidate(candidateId);
    return NextResponse.json({ ok: true, deletedCandidate });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: error.message || "CANDIDATE_DELETE_FAILED",
        message: "删除候选人失败，请确认候选人仍然存在。"
      },
      { status: 404 }
    );
  }
}
