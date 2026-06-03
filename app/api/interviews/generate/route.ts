import { NextResponse } from "next/server";
import { generateJson } from "../../../../lib/ai/provider.js";
import {
  buildInterviewGuideUserPrompt,
  buildSystemPrompt,
  PROMPT_VERSIONS
} from "../../../../lib/ai/prompts.js";
import { canGenerateInterviewAi, validateInterviewGuide } from "../../../../lib/domain/interviews.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function POST(request: Request) {
  const body = await request.json();
  const store = createRecruitingStore();
  const organizationId = body.organizationId || "org_demo";
  const snapshot = await store.getSnapshot();
  const job = snapshot.jobs.find((item: any) => item.id === body.jobId) || snapshot.jobs[0];
  const candidate = snapshot.candidates.find((item: any) => item.id === body.candidateId) || body.candidate || null;
  const screeningRun =
    snapshot.screeningRuns.find((item: any) => item.id === body.screeningRunId) ||
    snapshot.screeningRuns.find((item: any) => item.candidateId === candidate?.id) ||
    null;
  const connection = await store.getActiveModelConnection({
    organizationId,
    workflow: "interviewGuide"
  });
  const readiness = canGenerateInterviewAi({
    hasVerifiedUserApiConnection: Boolean(connection)
  });

  if (!readiness.ok) {
    return NextResponse.json(readiness, { status: 400 });
  }
  if (!job || !candidate?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_CONTEXT_REQUIRED",
        message: "请先选择岗位和候选人，再生成面试指南。"
      },
      { status: 400 }
    );
  }

  const questionCount = Number(body.questionCount);
  if (!Number.isInteger(questionCount)) {
    return NextResponse.json(
      {
        ok: false,
        code: "QUESTION_COUNT_REQUIRED",
        message: "请先输入所需问题数量（3-8之间的整数）。"
      },
      { status: 400 }
    );
  }
  if (questionCount < 3 || questionCount > 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "QUESTION_COUNT_OUT_OF_RANGE",
        message: "所需问题数量必须为3-8之间的整数。"
      },
      { status: 400 }
    );
  }

  const candidateProfile = candidate?.resume?.parsedProfile || candidate?.profile || {};
  const focusRequirements = typeof body.focusRequirements === "string" ? body.focusRequirements.trim() : "";
  const userPrompt = buildInterviewGuideUserPrompt({
    job,
    candidateProfile: {
      ...candidateProfile,
      productResumeScore: candidate?.resume?.productResumeScore || null,
      candidateName: candidate?.name
    },
    questionCount,
    focusRequirements
  });
  const result = await generateJson({
    organizationId,
    workflow: "interviewGuide",
    system: buildSystemPrompt("interviewGuide"),
    user: userPrompt,
    schemaName: "interviewGuide",
    connections: (connection ? [connection] : []) as any
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  const validation = validateInterviewGuide(result.parsed, job?.criteria || []);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_GUIDE_CRITERIA_MAPPING_FAILED",
        message: "面试题没有正确关联已审批评分标准，请调整模型输出后重试。",
        errors: validation.errors,
        modelConfig: result.modelConfig
      },
      { status: 422 }
    );
  }

  const promptVersion = PROMPT_VERSIONS.interviewGuide;
  const interviewGuide = await store.saveInterviewGuide({
    jobId: job.id,
    candidateId: candidate.id,
    screeningRunId: screeningRun?.id,
    result: result.parsed,
    modelConfig: {
      ...result.modelConfig,
      promptVersion
    }
  });

  return NextResponse.json({
    ...result,
    promptVersion,
    interviewGuide,
    validation
  });
}
