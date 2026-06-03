import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { generateJson } from "../../../../lib/ai/provider.js";
import {
  buildScreeningUserPrompt,
  buildSystemPrompt,
  PROMPT_VERSIONS
} from "../../../../lib/ai/prompts.js";
import { canRunScreening, validateScreeningRecommendation } from "../../../../lib/domain/screening.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

function hashInput(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json();
  const store = createRecruitingStore();
  const snapshot = await store.getSnapshot();
  const organizationId = body.organizationId || "org_demo";
  const job = snapshot.jobs.find((item: any) => item.id === body.jobId) || snapshot.jobs[0];
  const candidate =
    snapshot.candidates.find((item: any) => item.id === body.candidateId) ||
    (body.candidateProfile ? { hasResume: true, profile: body.candidateProfile } : null);
  const connection = await store.getActiveModelConnection({
    organizationId,
    workflow: "screening"
  });

  const hasVerifiedUserApiConnection = Boolean(connection);
  const hasResumeUploaded = Boolean(
    body.resumeUploaded || body.resumeText || body.candidateProfile || body.candidate?.resumeText || candidate?.hasResume
  );
  const readiness = canRunScreening({
    rubricApproved: body.rubricApproved !== false && Boolean(job?.rubricApproved),
    hasResumeUploaded,
    hasVerifiedUserApiConnection
  });

  if (!readiness.ok) {
    return NextResponse.json(readiness, { status: 400 });
  }

  const userPrompt = buildScreeningUserPrompt({ job, candidate });
  const result = await generateJson({
    organizationId,
    workflow: "screening",
    system: buildSystemPrompt("screening"),
    user: userPrompt,
    schemaName: "screeningRecommendation",
    connections: (connection ? [connection] : []) as any
  });

  if (!result.ok || !job || !candidate?.id) {
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  const evidenceValidation = validateScreeningRecommendation(result.parsed);
  if (!evidenceValidation.valid) {
    return NextResponse.json(
      {
        ok: false,
        code: "SCREENING_EVIDENCE_REQUIRED",
        message: "初筛结果缺少简历证据或缺失信息说明，请调整提示词或模型输出后重试。",
        errors: evidenceValidation.errors,
        modelConfig: result.modelConfig
      },
      { status: 422 }
    );
  }

  const screeningRun = await store.saveScreeningRun({
    jobId: job.id,
    candidateId: candidate.id,
    result: result.parsed,
    modelConfig: {
      ...result.modelConfig,
      promptVersion: PROMPT_VERSIONS.screening,
      inputHash: hashInput(userPrompt)
    }
  });

  return NextResponse.json({ ...result, screeningRun });
}
