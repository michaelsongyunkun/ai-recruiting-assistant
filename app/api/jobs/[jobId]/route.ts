import { NextResponse } from "next/server";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function DELETE(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;

  try {
    const deletedJob = await createRecruitingStore().deleteJob(jobId);
    return NextResponse.json({ ok: true, deletedJob });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: error.message || "JOB_DELETE_FAILED",
        message: "删除岗位失败，请确认岗位仍然存在。"
      },
      { status: 404 }
    );
  }
}
