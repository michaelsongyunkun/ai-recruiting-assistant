import { NextResponse } from "next/server";
import { parseResumeWithDeepSeek } from "../../../../lib/documents/resume-ai-parser.js";
import { extractResumeTextFromFile } from "../../../../lib/documents/resume-text-extractor.js";
import { buildResumeParsingWorkflow } from "../../../../lib/documents/resume-workflow.js";
import { createRecruitingStore } from "../../../../lib/server/recruiting-store.js";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        code: "RESUME_FILE_REQUIRED",
        message: "请先选择候选人简历文件。"
      },
      { status: 400 }
    );
  }

  const extraction = await extractResumeTextFromFile(file);
  if (!extraction.ok) {
    return NextResponse.json(extraction, { status: extraction.status || 422 });
  }

  const text = String(extraction.text || "");
  if (!text.trim()) {
    return NextResponse.json(
      {
        ok: false,
        code: "RESUME_TEXT_REQUIRED",
        message: "简历内容为空，无法解析。"
      },
      { status: 400 }
    );
  }

  const aiResult = await parseResumeWithDeepSeek({
    store: createRecruitingStore(),
    organizationId: String(form.get("organizationId") || "org_demo"),
    fileName: file.name,
    resumeText: text
  });

  if (!aiResult.ok) {
    return NextResponse.json(aiResult, { status: aiResult.status || 502 });
  }

  const modelConfig = (aiResult as any).modelConfig;
  const parsingWorkflow = buildResumeParsingWorkflow({
    file: {
      name: file.name,
      size: file.size,
      type: file.type || "text/plain"
    },
    text,
    profile: aiResult.profile,
    modelConfig,
    textExtraction: extraction.textExtraction
  } as any);

  return NextResponse.json({
    ok: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type || "text/plain"
    },
    candidateProfile: aiResult.profile,
    parsingWorkflow,
    modelConfig,
    textExtraction: extraction.textExtraction
  });
}
