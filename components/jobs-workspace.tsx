"use client";

import { useEffect, useState } from "react";

type JobCriterionInput = {
  name: string;
  weight: number;
  anchor: string;
  approved: boolean;
};

type CriterionRow = {
  id: string;
  name: string;
  weight: string;
  anchor: string;
};

type Job = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  jd?: string;
  criteria?: Array<JobCriterionInput & { id?: string }>;
};

type JobsSnapshot = {
  jobs: Job[];
};

const criterionExamples = [
  {
    name: "产品发现",
    weight: "35",
    anchor: "能发现客户问题、验证假设，并把需求收敛为可执行 MVP。"
  },
  {
    name: "干系人协同",
    weight: "25",
    anchor: "能协调研发、销售、客服和管理层，推动关键取舍。"
  },
  {
    name: "数据分析",
    weight: "25",
    anchor: "能用产品指标、漏斗和实验结果支持决策。"
  },
  {
    name: "书面表达",
    weight: "15",
    anchor: "能写清楚产品方案、上线说明和决策记录。"
  }
];

function createDefaultCriteriaRows(): CriterionRow[] {
  return criterionExamples.map((example, index) => ({
    id: `criterion-${index + 1}`,
    name: example.name,
    weight: example.weight,
    anchor: example.anchor
  }));
}

function text(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function buildCriteriaFromForm(form: FormData) {
  const names = form.getAll("criterionName");
  const weights = form.getAll("criterionWeight");
  const anchors = form.getAll("criterionAnchor");
  const approved = form.get("criteriaApproved") === "on";

  return names
    .map((name, index) => ({
      name: text(name),
      weight: Number(text(weights[index] || "")),
      anchor: text(anchors[index] || ""),
      approved
    }))
    .filter((criterion) => criterion.name || criterion.weight > 0 || criterion.anchor);
}

function criteriaStatus(criteria: JobCriterionInput[]) {
  if (criteria.length === 0) return "请至少配置一条岗位评分标准。";
  if (criteria.some((criterion) => !criterion.name || !criterion.anchor || criterion.weight <= 0)) {
    return "请完整填写评分标准名称、权重和评分锚点。";
  }
  if (Math.abs(criteria.reduce((sum, criterion) => sum + criterion.weight, 0) - 100) > 0.001) {
    return "评分标准权重合计需为 100%。";
  }
  if (criteria.some((criterion) => !criterion.approved)) {
    return "请先确认评分标准已人工审批。";
  }
  return "";
}

function CriteriaFields({
  criteriaRows,
  addCriterion,
  removeCriterion
}: {
  criteriaRows: CriterionRow[];
  addCriterion: () => void;
  removeCriterion: (criterionId: string) => void;
}) {
  return (
    <fieldset className="criteriaEditor">
      <legend>岗位评分标准</legend>
      <p className="helperText">新增岗位需填写名称、权重和评分锚点；权重合计需为 100%。</p>
      {criteriaRows.map((criterion, index) => (
        <div className="criteriaInputRow" key={criterion.id}>
          <label>
            标准名称
            <input name="criterionName" placeholder={criterion.name || "例如：产品发现"} required={index === 0} />
          </label>
          <label>
            权重
            <input
              inputMode="decimal"
              name="criterionWeight"
              placeholder={criterion.weight || "20"}
              required={index === 0}
              type="number"
              min="1"
              max="100"
              step="1"
            />
          </label>
          <label>
            评分锚点
            <input name="criterionAnchor" placeholder={criterion.anchor || "说明该标准的评分依据"} required={index === 0} />
          </label>
          <button
            className="dangerButton criteriaRemoveButton"
            disabled={criteriaRows.length === 1}
            onClick={() => removeCriterion(criterion.id)}
            type="button"
          >
            删除标准
          </button>
        </div>
      ))}
      <button className="secondaryButton criteriaAddButton" onClick={addCriterion} type="button">
        新增标准
      </button>
      <label className="approvalCheck">
        <input name="criteriaApproved" type="checkbox" required />
        <span>已人工确认评分标准与岗位职责相关，可作为初筛依据。</span>
      </label>
    </fieldset>
  );
}

export function JobsWorkspace() {
  const [snapshot, setSnapshot] = useState<JobsSnapshot>({ jobs: [] });
  const [status, setStatus] = useState("正在加载岗位...");
  const [criteriaRows, setCriteriaRows] = useState<CriterionRow[]>(createDefaultCriteriaRows);

  async function refresh(message?: string) {
    const response = await fetch("/api/workspace");
    const payload = await response.json();
    setSnapshot({ jobs: payload.snapshot.jobs || [] });
    setStatus(message || "岗位列表已更新。");
  }

  useEffect(() => {
    refresh("岗位列表已加载。").catch(() => setStatus("加载岗位失败，请确认本地服务正在运行。"));
  }, []);

  async function createJobFromInput(input: {
    title: string;
    department?: string;
    location?: string;
    jd: string;
    criteria: JobCriterionInput[];
    successMessage: string;
  }) {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        department: input.department,
        location: input.location,
        jd: input.jd,
        criteria: input.criteria
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "创建岗位失败。");
      return null;
    }
    await refresh(input.successMessage);
    return payload.job;
  }

  function addCriterion() {
    setCriteriaRows((rows) => [
      ...rows,
      {
        id: `criterion-${Date.now()}-${rows.length + 1}`,
        name: "",
        weight: "",
        anchor: ""
      }
    ]);
  }

  function removeCriterion(criterionId: string) {
    setCriteriaRows((rows) => (rows.length === 1 ? rows : rows.filter((criterion) => criterion.id !== criterionId)));
  }

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = text(form.get("title"));
    const jd = text(form.get("jd"));
    const criteria = buildCriteriaFromForm(form);
    const criteriaMessage = criteriaStatus(criteria);

    if (!title || !jd) {
      setStatus("请填写岗位名称和岗位 JD。");
      return;
    }
    if (criteriaMessage) {
      setStatus(criteriaMessage);
      return;
    }

    const job = await createJobFromInput({
      title,
      department: text(form.get("department")),
      location: text(form.get("location")),
      jd,
      criteria,
      successMessage: `已新增岗位：${title}。`
    });

    if (job) {
      event.currentTarget.reset();
      setCriteriaRows(createDefaultCriteriaRows());
    }
  }

  async function deleteJob(job: Job) {
    const confirmed = window.confirm(`确认删除岗位「${job.title}」？相关初筛和面试记录也会一并删除。`);
    if (!confirmed) return;

    const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "删除岗位失败。");
      return;
    }
    await refresh(`已删除岗位：${job.title}。`);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">岗位库</p>
            <h2>岗位设置</h2>
          </div>
          <span className="statusPill success">{snapshot.jobs.length} 个岗位</span>
        </div>
        <p className="helperText">{status}</p>
      </section>

      <section className="panel">
        <p className="eyebrow">手动创建</p>
        <h2>新增岗位</h2>
        <form className="formStack" onSubmit={createJob}>
          <label>
            岗位名称
            <input name="title" placeholder="例如：高级产品经理" required />
          </label>
          <div className="settingsGrid">
            <label>
              部门
              <input name="department" placeholder="例如：产品部" />
            </label>
            <label>
              地点
              <input name="location" placeholder="例如：上海 / 远程" />
            </label>
          </div>
          <label>
            岗位 JD
            <textarea name="jd" rows={6} placeholder="粘贴岗位职责、任职要求和硬性条件。" required />
          </label>
          <CriteriaFields
            addCriterion={addCriterion}
            criteriaRows={criteriaRows}
            removeCriterion={removeCriterion}
          />
          <button type="submit">新增岗位</button>
        </form>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">已配置岗位</p>
            <h2>岗位评分标准</h2>
          </div>
        </div>
        <div className="managementList">
          {snapshot.jobs.length === 0 ? (
            <p className="helperText">暂无岗位，请先新增岗位。</p>
          ) : (
            snapshot.jobs.map((job) => (
              <article key={job.id}>
                <div>
                  <p className="eyebrow">{job.department || "未设置部门"}</p>
                  <h3>{job.title}</h3>
                  <p>{job.location || "未设置地点"}</p>
                  <p>{job.jd || "未填写 JD"}</p>
                  <div className="workflowRow">
                    {(job.criteria || []).map((criterion, index) => (
                      <span className="workflowChip" key={criterion.id || `${criterion.name}-${index}`}>
                        {criterion.name} / {criterion.weight}%
                      </span>
                    ))}
                  </div>
                </div>
                <button className="dangerButton" type="button" onClick={() => deleteJob(job)}>
                  删除岗位
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
