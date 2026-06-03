import { NextResponse } from "next/server";
import { validateSchema } from "../../../../lib/ai/schemas.js";
import { scoreProductManagerResume } from "../../../../lib/documents/product-resume-scorer.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function POST(request: Request) {
  const body = await request.json();
  const store = createRecruitingStore();
  const snapshot = await store.getSnapshot();
  const organizationId = body.organizationId || "org_demo";
  const candidateProfile = body.candidateProfile;
  const validation = validateSchema("resumeProfile", candidateProfile);

  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        code: "RESUME_PROFILE_REQUIRED",
        message: "请先完成 DeepSeek 简历解析，再运行产品岗简历评分。",
        errors: validation.errors
      },
      { status: 400 }
    );
  }

  const job = snapshot.jobs.find((item: any) => item.id === body.jobId) || snapshot.jobs[0];
  const scoring = await scoreProductManagerResume({
    store,
    organizationId,
    job,
    candidateProfile
  });

  if (!scoring.ok) {
    return NextResponse.json(scoring, { status: (scoring as any).status || 502 });
  }

  return NextResponse.json({
    ok: true,
    job,
    score: scoring.score,
    modelConfig: scoring.modelConfig
  });
}
