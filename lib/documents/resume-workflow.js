function hasValue(value) {
  return typeof value === "string" && value.trim() !== "";
}

function looksLikeUnparsedDocument(text) {
  const prefix = String(text || "").slice(0, 16);
  return prefix.startsWith("%PDF") || prefix.startsWith("PK\u0003\u0004") || text.includes("\u0000");
}

function check(status, label, detail) {
  return { status, label, detail };
}

function scoreForStatus(status, points) {
  if (status === "success") return points;
  if (status === "watch") return Math.round(points * 0.45);
  return 0;
}

export function buildResumeQualityChecks({ text, profile }) {
  const textLength = String(text || "").trim().length;
  const isUnparsedDocument = looksLikeUnparsedDocument(text);
  const checks = [];

  checks.push(
    check(
      textLength >= 40 && !isUnparsedDocument ? "success" : "blocked",
      "文本提取",
      isUnparsedDocument
        ? "文件像是未解析的 PDF/DOCX 二进制内容，请先转为可复制文本或接入专用解析库。"
        : textLength >= 40
          ? `已提取约 ${textLength} 个字符。`
          : "可用文本太少，暂时无法稳定解析。"
    )
  );

  checks.push(
    check(
      hasValue(profile?.name) && (hasValue(profile?.email) || hasValue(profile?.phone))
        ? "success"
        : hasValue(profile?.name)
          ? "watch"
          : "blocked",
      "基础信息",
      hasValue(profile?.name)
        ? `识别到姓名${hasValue(profile?.email) ? "和邮箱" : ""}${hasValue(profile?.phone) ? "、电话" : ""}。`
        : "未识别到候选人姓名。"
    )
  );

  checks.push(
    check(
      profile?.workHistory?.length > 0 ? "success" : "watch",
      "工作经历",
      profile?.workHistory?.length > 0
        ? `识别到 ${profile.workHistory.length} 段工作经历。`
        : "未识别到标准格式的工作经历，可在保存前人工复核。"
    )
  );

  checks.push(
    check(
      profile?.skills?.length >= 2 ? "success" : profile?.skills?.length === 1 ? "watch" : "blocked",
      "技能关键词",
      profile?.skills?.length > 0
        ? `识别到 ${profile.skills.length} 个技能或岗位能力关键词。`
        : "未识别到技能关键词，初筛证据会较弱。"
    )
  );

  checks.push(
    check(
      profile?.education?.length > 0 ? "success" : "watch",
      "教育背景",
      profile?.education?.length > 0
        ? `识别到 ${profile.education.length} 条教育背景。`
        : "未识别到教育背景；如果岗位不强依赖学历，可继续人工确认。"
    )
  );

  checks.push(
    check(
      profile?.protectedTraitsInferred ? "blocked" : "success",
      "合规检查",
      profile?.protectedTraitsInferred
        ? "解析结果包含受保护特征推断，需要移除后再进入初筛。"
        : "未推断年龄、性别、族裔等受保护特征。"
    )
  );

  return checks;
}

export function buildResumeParsingWorkflow({ file = {}, text = "", profile, modelConfig = null, textExtraction = null }) {
  const checks = buildResumeQualityChecks({ text, profile });
  const weights = [20, 20, 20, 20, 10, 10];
  const qualityScore = checks.reduce(
    (sum, item, index) => sum + scoreForStatus(item.status, weights[index] || 0),
    0
  );
  const hasBlockedCriticalCheck = checks.some(
    (item) => item.status === "blocked" && ["文本提取", "基础信息", "技能关键词", "合规检查"].includes(item.label)
  );
  const readiness = hasBlockedCriticalCheck ? "blocked" : qualityScore >= 70 ? "ready" : "needs_review";
  const readinessTone = readiness === "ready" ? "success" : readiness === "blocked" ? "blocked" : "watch";

  return {
    readyToSave: readiness !== "blocked",
    readiness,
    quality: {
      score: qualityScore,
      tone: readinessTone,
      summary:
        readiness === "ready"
          ? "DeepSeek 解析质量较好，可以保存候选人并进入初筛。"
          : readiness === "blocked"
            ? "DeepSeek 解析结果未通过关键质检，请更换可提取文本的简历或重新解析。"
            : "DeepSeek 解析结果可用，但建议人工复核缺失字段。"
    },
    steps: [
      {
        id: "upload",
        title: "接收简历文件",
        status: "success",
        detail: `${file.name || "简历文件"}，${Math.max(1, Math.round((file.size || 0) / 1024))} KB`
      },
      {
        id: "extract",
        title: "提取简历文本",
        status: checks[0].status,
        detail: textExtraction?.summary || checks[0].detail
      },
      {
        id: "structure",
        title: "DeepSeek 大模型解析",
        status:
          checks[1].status === "blocked" || checks[3].status === "blocked"
            ? "blocked"
            : checks[1].status === "watch" || checks[2].status === "watch" || checks[3].status === "watch"
              ? "watch"
              : "success",
        detail: modelConfig?.model
          ? `${modelConfig.provider || "DeepSeek"} / ${modelConfig.model} 已返回结构化简历 JSON。`
          : "DeepSeek 节点已返回结构化简历 JSON。"
      },
      {
        id: "quality",
        title: "质检与合规检查",
        status: readinessTone,
        detail: `解析质量 ${qualityScore} / 100。${checks[5].detail}`
      },
      {
        id: "save",
        title: "保存候选人并初筛",
        status: readiness === "blocked" ? "blocked" : "watch",
        detail:
          readiness === "blocked"
            ? "修复解析问题后才能保存候选人。"
            : "确认解析结果后保存候选人，再运行简历初筛。"
      }
    ],
    checks,
    fields: [
      { label: "姓名", value: profile?.name || "未识别", status: hasValue(profile?.name) ? "success" : "blocked" },
      { label: "邮箱", value: profile?.email || "未识别", status: hasValue(profile?.email) ? "success" : "watch" },
      { label: "电话", value: profile?.phone || "未识别", status: hasValue(profile?.phone) ? "success" : "watch" },
      {
        label: "工作经历",
        value: `${profile?.workHistory?.length || 0} 段`,
        status: profile?.workHistory?.length > 0 ? "success" : "watch"
      },
      {
        label: "技能关键词",
        value: `${profile?.skills?.length || 0} 个`,
        status: profile?.skills?.length > 0 ? "success" : "blocked"
      },
      {
        label: "教育背景",
        value: `${profile?.education?.length || 0} 条`,
        status: profile?.education?.length > 0 ? "success" : "watch"
      }
    ]
  };
}
