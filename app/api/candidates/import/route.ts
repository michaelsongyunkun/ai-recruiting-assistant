import { NextResponse } from "next/server";
import { validateSchema } from "../../../../lib/ai/schemas.js";
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

  const store = createRecruitingStore();
  const candidateProfileRaw = form.get("candidateProfile");
  const parserModelConfigRaw = form.get("parserModelConfig");
  const productResumeScoreRaw = form.get("productResumeScore");
  let profile = null;
  let modelConfig = null;
  let productResumeScore = null;

  if (typeof candidateProfileRaw === "string" && candidateProfileRaw.trim()) {
    try {
      profile = JSON.parse(candidateProfileRaw);
      if (typeof parserModelConfigRaw === "string" && parserModelConfigRaw.trim()) {
        modelConfig = JSON.parse(parserModelConfigRaw);
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "RESUME_PROFILE_JSON_INVALID",
          message: "DeepSeek 简历解析结果 JSON 无法读取，请重新解析后再保存。"
        },
        { status: 400 }
      );
    }
    const validation = validateSchema("resumeProfile", profile);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          code: "RESUME_PROFILE_VALIDATION_FAILED",
          message: "DeepSeek 简历解析结果结构不符合要求，请重新解析后再保存。",
          errors: validation.errors
        },
        { status: 422 }
      );
    }
    if (typeof productResumeScoreRaw === "string" && productResumeScoreRaw.trim()) {
      try {
        productResumeScore = JSON.parse(productResumeScoreRaw);
      } catch {
        return NextResponse.json(
          {
            ok: false,
            code: "PRODUCT_RESUME_SCORE_JSON_INVALID",
            message: "DeepSeek 产品岗简历评分结果 JSON 无法读取，请重新评分后再保存。"
          },
          { status: 400 }
        );
      }
      const scoreValidation = validateSchema("productResumeScore", productResumeScore);
      if (!scoreValidation.valid) {
        return NextResponse.json(
          {
            ok: false,
            code: "PRODUCT_RESUME_SCORE_VALIDATION_FAILED",
            message: "DeepSeek 产品岗简历评分结果结构不符合要求，请重新评分后再保存。",
            errors: scoreValidation.errors
          },
          { status: 422 }
        );
      }
    }
  } else {
    const aiResult = await parseResumeWithDeepSeek({
      store,
      organizationId: String(form.get("organizationId") || "org_demo"),
      fileName: file.name,
      resumeText: text
    });

    if (!aiResult.ok) {
      return NextResponse.json(aiResult, { status: aiResult.status || 502 });
    }

    profile = aiResult.profile;
    modelConfig = aiResult.modelConfig;
  }

  const parsingWorkflow = buildResumeParsingWorkflow({
    file: {
      name: file.name,
      size: file.size,
      type: file.type || "text/plain"
    },
    text,
    profile,
    modelConfig,
    textExtraction: extraction.textExtraction
  } as any);
  const candidate = await store.createCandidateFromResume({
    fileName: file.name,
    resumeText: text,
    profile,
    modelConfig,
    productResumeScore,
    parsingWorkflow,
    textExtraction: extraction.textExtraction
  });

  return NextResponse.json({
    ok: true,
    resumeUploaded: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type || "text/plain"
    },
    candidate,
    candidateProfile: profile,
    productResumeScore,
    parsingWorkflow,
    modelConfig,
    textExtraction: extraction.textExtraction
  });
}
