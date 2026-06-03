function valueText(value, fallback = "未提供") {
  const text = String(value || "").trim();
  return text || fallback;
}

function listLines(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) return "- 无";
  return items.map((item, index) => `- ${formatter(item, index)}`).join("\n");
}

function stringList(items) {
  if (!Array.isArray(items) || items.length === 0) return "无";
  return items.filter(Boolean).join("；");
}

function tableRows(items, columns, emptyText = "无") {
  if (!Array.isArray(items) || items.length === 0) {
    return `| ${columns.map((_, index) => (index === 0 ? emptyText : "")).join(" | ")} |`;
  }
  return items
    .map((item) => `| ${columns.map((column) => valueText(item?.[column.key], column.fallback || "")).join(" | ")} |`)
    .join("\n");
}

function workflowStatusLabel(status) {
  if (status === "success") return "通过";
  if (status === "watch") return "需复核";
  if (status === "blocked") return "阻塞";
  return valueText(status, "未知");
}

export function getResumeParsingReportFileName({ candidateName = "", fileName = "" } = {}) {
  const rawBase = valueText(candidateName, fileName.replace(/\.[^.]+$/, "") || "简历解析结果");
  const safeBase = rawBase.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 60);
  return `${safeBase || "简历解析结果"}-简历解析结果.md`;
}

export function formatResumeParsingReport({
  profile = {},
  workflow = null,
  modelConfig = null,
  fileName = "",
  exportedAt = new Date().toISOString()
} = {}) {
  const workRows = tableRows(
    profile.workHistory,
    [
      { key: "title", fallback: "未提供" },
      { key: "company", fallback: "未提供" },
      { key: "startDate", fallback: "未提供" },
      { key: "endDate", fallback: "未提供" },
      { key: "evidence", fallback: "未提供" }
    ]
  );

  const educationRows = tableRows(
    profile.education,
    [
      { key: "institution", fallback: "未提供" },
      { key: "credential", fallback: "未提供" },
      { key: "date", fallback: "未提供" },
      { key: "evidence", fallback: "未提供" }
    ]
  );

  const projectRows = tableRows(
    profile.projects,
    [
      { key: "name", fallback: "未提供" },
      { key: "role", fallback: "未提供" },
      { key: "summary", fallback: "未提供" },
      { key: "evidence", fallback: "未提供" }
    ]
  );

  return `# 简历解析结果

导出时间：${exportedAt}
原始文件：${valueText(fileName)}

## 一、候选人基础信息

| 字段 | 结果 |
|---|---|
| 姓名 | ${valueText(profile.name)} |
| 邮箱 | ${valueText(profile.email)} |
| 电话 | ${valueText(profile.phone)} |
| 地点 | ${valueText(profile.location)} |

## 二、工作经历

| 职位 | 公司 | 开始时间 | 结束时间 | 依据 |
|---|---|---|---|---|
${workRows}

## 三、技能关键词

${listLines(profile.skills, (item) => `${valueText(item?.name)}：${valueText(item?.evidence)}`)}

## 四、教育经历

| 学校/机构 | 学历/证书 | 时间 | 依据 |
|---|---|---|---|
${educationRows}

## 五、项目经历

| 项目 | 角色 | 摘要 | 依据 |
|---|---|---|---|
${projectRows}

## 六、证书

${listLines(profile.certifications, (item) => `${valueText(item?.name)}，${valueText(item?.issuer)}，${valueText(item?.date)}。依据：${valueText(item?.evidence)}`)}

## 七、解析质量与 Workflow

解析质量：${workflow?.quality?.score ?? "未提供"} / 100
解析结论：${valueText(workflow?.quality?.summary)}

### Workflow 步骤

${listLines(workflow?.steps, (item, index) => `${index + 1}. ${valueText(item?.title)} - ${workflowStatusLabel(item?.status)}。${valueText(item?.detail)}`)}

### 质量检查

${listLines(workflow?.checks, (item) => `${valueText(item?.label)} - ${workflowStatusLabel(item?.status)}。${valueText(item?.detail)}`)}

## 八、模型与合规信息

| 字段 | 结果 |
|---|---|
| 服务商 | ${valueText(modelConfig?.provider)} |
| 模型 | ${valueText(modelConfig?.model)} |
| Prompt 版本 | ${valueText(modelConfig?.promptVersion)} |
| 是否推断受保护特征 | ${profile.protectedTraitsInferred ? "是" : "否"} |

## 九、信息缺口与解析备注

未支持或未能证实的信息：
${listLines(profile.unsupportedClaims, (item) => valueText(item))}

解析备注：
${listLines(profile.parsingNotes, (item) => valueText(item))}

原始数组摘要：
- 工作职责：${stringList((profile.workHistory || []).flatMap((item) => item.responsibilities || []))}
- 工作成果：${stringList((profile.workHistory || []).flatMap((item) => item.achievements || []))}
`;
}
