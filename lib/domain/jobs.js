function text(value) {
  return String(value || "").trim();
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeJobCriteriaInput(criteria) {
  if (!Array.isArray(criteria)) return [];

  return criteria
    .map((criterion) => ({
      id: text(criterion?.id) || undefined,
      name: text(criterion?.name),
      weight: numberValue(criterion?.weight),
      anchor: text(criterion?.anchor),
      approved: criterion?.approved === true
    }))
    .filter((criterion) => criterion.name || criterion.weight > 0 || criterion.anchor);
}

export function validateJobInput(input) {
  const job = {
    title: text(input?.title),
    department: text(input?.department),
    location: text(input?.location),
    jd: text(input?.jd),
    criteria: normalizeJobCriteriaInput(input?.criteria)
  };
  const errors = [];

  if (!job.title) errors.push("请填写岗位名称。");
  if (!job.jd) errors.push("请填写岗位 JD。");
  if (job.criteria.length === 0) {
    errors.push("请至少配置一条岗位评分标准。");
  }

  for (const [index, criterion] of job.criteria.entries()) {
    const label = `第 ${index + 1} 条评分标准`;
    if (!criterion.name) errors.push(`${label}需填写名称。`);
    if (criterion.weight <= 0) errors.push(`${label}需填写大于 0 的权重。`);
    if (!criterion.anchor) errors.push(`${label}需填写评分锚点。`);
    if (!criterion.approved) errors.push(`${label}需先完成人工审批确认。`);
  }

  const totalWeight = job.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (job.criteria.length > 0 && Math.abs(totalWeight - 100) > 0.001) {
    errors.push("评分标准权重合计需为 100%。");
  }

  return {
    ok: errors.length === 0,
    job,
    message: errors.join(" ")
  };
}
