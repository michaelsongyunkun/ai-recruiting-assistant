import { NextResponse } from "next/server";
import { generateJson } from "../../../../../lib/ai/provider.js";
import {
  buildInterviewSummaryUserPrompt,
  buildSystemPrompt,
  PROMPT_VERSIONS
} from "../../../../../lib/ai/prompts.js";
import { canGenerateInterviewAi, validateInterviewSummary } from "../../../../../lib/domain/interviews.js";
import { createRecruitingStore } from "../../../../../lib/server/recruiting-store.js";

export async function POST(request: Request, context: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await context.params;
  const body = await request.json();
  const store = createRecruitingStore();
  const organizationId = body.organizationId || "org_demo";
  const snapshot = await store.getSnapshot();
  const guide = snapshot.interviewGuides.find((item: any) => item.id === interviewId);
  if (!guide) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_GUIDE_NOT_FOUND",
        message: "没有找到要总结的面试指南。"
      },
      { status: 404 }
    );
  }
  const allNotes = snapshot.interviewNotes.filter((item: any) => item.interviewGuideId === interviewId);
  const selectedNotes = Array.isArray(body.noteIds)
    ? allNotes.filter((note: any) => body.noteIds.includes(note.id))
    : allNotes;
  const noteIds = selectedNotes.map((note: any) => note.id);
  const notesText =
    body.notes ||
    selectedNotes.map((note: any) => `${note.id}: ${note.content}`).join("\n");

  if (!notesText.trim() || noteIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_NOTES_REQUIRED",
        message: "请先记录面试笔记，再生成面试总结。"
      },
      { status: 400 }
    );
  }

  const connection = await store.getActiveModelConnection({
    organizationId,
    workflow: "interviewSummary"
  });
  const readiness = canGenerateInterviewAi({
    hasVerifiedUserApiConnection: Boolean(connection)
  });

  if (!readiness.ok) {
    return NextResponse.json(readiness, { status: 400 });
  }

  const result = await generateJson({
    organizationId,
    workflow: "interviewSummary",
    system: buildSystemPrompt("interviewSummary"),
    user: buildInterviewSummaryUserPrompt({
      notes: notesText,
      noteIds,
      guideResult: guide.result
    }),
    schemaName: "interviewSummary",
    connections: (connection ? [connection] : []) as any
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  const validation = validateInterviewSummary(result.parsed);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERVIEW_SUMMARY_CITATION_REQUIRED",
        message: "面试总结必须引用面试记录，且不能新增记录中没有的判断。",
        errors: validation.errors,
        modelConfig: result.modelConfig
      },
      { status: 422 }
    );
  }

  const promptVersion = PROMPT_VERSIONS.interviewSummary;
  const interviewSummary = await store.saveInterviewSummary({
    interviewGuideId: interviewId,
    result: result.parsed,
    modelConfig: {
      ...result.modelConfig,
      promptVersion
    }
  });

  return NextResponse.json({
    ...result,
    summary: result.parsed,
    interviewSummary,
    validation,
    promptVersion,
    requiresHumanConfirmation: true
  });
}
