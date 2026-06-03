"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  jobs: any[];
  candidates: any[];
  screeningRuns: any[];
  humanDecisions: any[];
  auditEvents: any[];
  modelConnections: any[];
};

const emptySnapshot: Snapshot = {
  jobs: [],
  candidates: [],
  screeningRuns: [],
  humanDecisions: [],
  auditEvents: [],
  modelConnections: []
};

const defaultCriteria = [
  { name: "产品发现", weight: 40, anchor: "能验证客户问题并收敛 MVP。", approved: true },
  { name: "数据分析", weight: 30, anchor: "能用指标支持产品决策。", approved: true },
  { name: "干系人协同", weight: 30, anchor: "能协调研发、销售和管理层。", approved: true }
];

export function ScreeningWorkspace() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [status, setStatus] = useState("正在加载本地数据...");
  const [reviewerName, setReviewerName] = useState("HR 张三");

  const selectedJob = useMemo(
    () => snapshot.jobs.find((job) => job.id === selectedJobId) || snapshot.jobs[0],
    [snapshot.jobs, selectedJobId]
  );
  const selectedCandidate = useMemo(
    () => snapshot.candidates.find((candidate) => candidate.id === selectedCandidateId) || snapshot.candidates[0],
    [snapshot.candidates, selectedCandidateId]
  );
  const latestRun = useMemo(
    () =>
      snapshot.screeningRuns.find(
        (run) => run.jobId === selectedJob?.id && run.candidateId === selectedCandidate?.id
      ) || snapshot.screeningRuns[0],
    [snapshot.screeningRuns, selectedJob?.id, selectedCandidate?.id]
  );
  const screeningConnection = useMemo(
    () =>
      snapshot.modelConnections.find(
        (connection) => connection.status === "verified" && connection.workflows?.includes("screening")
      ),
    [snapshot.modelConnections]
  );

  async function refresh(message?: string) {
    const response = await fetch("/api/workspace");
    const payload = await response.json();
    setSnapshot(payload.snapshot);
    setSelectedJobId((current) => current || payload.snapshot.jobs[0]?.id || "");
    setSelectedCandidateId((current) => current || payload.snapshot.candidates[0]?.id || "");
    setStatus(
      message ||
        (payload.snapshot.modelConnections?.some(
          (connection: any) => connection.status === "verified" && connection.workflows?.includes("screening")
        )
          ? "本地数据已更新，初筛 API 已验证。"
          : "请先在设置中保存并验证企业自己的初筛 API。")
    );
  }

  useEffect(() => {
    refresh("本地数据已加载。").catch(() => setStatus("加载失败，请确认本地服务正在运行。"));
  }, []);

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        department: form.get("department"),
        location: form.get("location"),
        jd: form.get("jd"),
        criteria: defaultCriteria
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "创建岗位失败。");
      return;
    }
    setSelectedJobId(payload.job.id);
    await refresh("岗位已创建，评分标准已自动审批。");
    event.currentTarget.reset();
  }

  async function uploadResume(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/candidates/import", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "上传简历失败。");
      return;
    }
    setSelectedCandidateId(payload.candidate.id);
    await refresh(`已上传并解析 ${payload.file.name}。`);
    event.currentTarget.reset();
  }

  async function runScreening() {
    if (!selectedJob || !selectedCandidate) {
      setStatus("请先选择岗位并上传候选人简历。");
      return;
    }
    if (!screeningConnection) {
      setStatus("请先在设置中保存并验证企业自己的初筛 API。");
      return;
    }
    const response = await fetch("/api/screening/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: selectedJob.id,
        candidateId: selectedCandidate.id
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "初筛失败。");
      return;
    }
    await refresh("初筛已保存，等待人工确认。");
  }

  async function confirmDecision(decision: string) {
    if (!latestRun) {
      setStatus("请先运行初筛。");
      return;
    }
    const response = await fetch("/api/applications/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        screeningRunId: latestRun.id,
        decision,
        reviewerName,
        note: `${decision}：由 ${reviewerName} 在本地工作台确认。`
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "人工确认失败。");
      return;
    }
    await refresh(`已确认：${decision}。`);
    if (decision === "进入面试") {
      router.push("/interviews");
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Sprint 1</p>
            <h2>真实初筛闭环</h2>
            <p>创建岗位、上传简历、运行初筛、保存结果，并由人工确认候选人下一阶段。</p>
          </div>
          <span className={`statusPill ${screeningConnection ? "success" : "blocked"}`}>
            {screeningConnection ? "初筛 API 已验证" : "需要连接 API"}
          </span>
        </div>
        <div className="metricRow">
          <div>
            <strong>{snapshot.jobs.length}</strong>
            <span>岗位</span>
          </div>
          <div>
            <strong>{snapshot.candidates.length}</strong>
            <span>候选人</span>
          </div>
          <div>
            <strong>{snapshot.screeningRuns.length}</strong>
            <span>初筛记录</span>
          </div>
          <div>
            <strong>{screeningConnection ? 1 : 0}</strong>
            <span>可用 API</span>
          </div>
        </div>
        <p className="helperText">{status}</p>
      </section>

      <div className="grid">
        <section className="panel">
          <p className="eyebrow">第一步</p>
          <h2>创建岗位</h2>
          <form className="formStack" onSubmit={createJob}>
            <label>
              岗位名称
              <input name="title" defaultValue="高级产品经理" required />
            </label>
            <label>
              部门
              <input name="department" defaultValue="产品部" />
            </label>
            <label>
              地点
              <input name="location" defaultValue="上海 / 远程" />
            </label>
            <label>
              JD 摘要
              <textarea name="jd" defaultValue="负责产品发现、数据分析和跨团队协作。" rows={4} />
            </label>
            <button type="submit">创建岗位并审批标准</button>
          </form>
        </section>

        <section className="panel">
          <p className="eyebrow">第二步</p>
          <h2>上传候选人简历</h2>
          <form className="formStack" onSubmit={uploadResume}>
            <label>
              简历文件
              <input name="resume" type="file" accept=".txt,.pdf,.doc,.docx,text/plain" required />
            </label>
            <button type="submit">上传并解析简历</button>
          </form>
          <p className="helperText">当前本地版优先支持可提取文本的简历；上传后会生成候选人档案。</p>
        </section>
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">第三步</p>
            <h2>选择岗位和候选人运行初筛</h2>
          </div>
          <button disabled={!selectedJob || !selectedCandidate || !screeningConnection} type="button" onClick={runScreening}>
            运行初筛
          </button>
        </div>
        {!screeningConnection ? (
          <p className="helperText">
            初筛会等待企业自己的 API 验证通过。<a className="textLink" href="/settings/model-api">前往设置</a>
          </p>
        ) : null}
        <div className="settingsGrid">
          <label>
            岗位
            <select value={selectedJob?.id || ""} onChange={(event) => setSelectedJobId(event.target.value)}>
              {snapshot.jobs.map((job) => (
                <option value={job.id} key={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            候选人
            <select
              value={selectedCandidate?.id || ""}
              onChange={(event) => setSelectedCandidateId(event.target.value)}
            >
              {snapshot.candidates.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.name} / {candidate.stage}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedJob && selectedCandidate ? (
          <div className="twoCol detailBlock">
            <div>
              <p className="eyebrow">岗位标准</p>
              <h3>{selectedJob.title}</h3>
              <ul>
                {selectedJob.criteria.map((criterion: any) => (
                  <li key={criterion.id}>
                    {criterion.name} / {criterion.weight}%
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">候选人档案</p>
              <h3>{selectedCandidate.name}</h3>
              <p>{selectedCandidate.email}</p>
              <div className="workflowRow">
                {(selectedCandidate.profile?.skills || []).slice(0, 6).map((skill: any) => (
                  <span className="workflowChip" key={skill.name}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="helperText">请先创建岗位并上传候选人简历。</p>
        )}
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">第四步</p>
            <h2>人工确认初筛结果</h2>
          </div>
          <label className="reviewerInput">
            审核人
            <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} />
          </label>
        </div>
        {latestRun ? (
          <div className="stack">
            <div className="screeningToast">
              <strong>{latestRun.result.summary}</strong>
              <p>
                综合评分：{latestRun.result.overallScore} / 状态：{latestRun.status}
              </p>
            </div>
            <div className="decisionRow">
              <button type="button" onClick={() => confirmDecision("进入面试")}>
                进入面试
              </button>
              <button type="button" onClick={() => confirmDecision("待补充信息")}>
                待补充信息
              </button>
              <button type="button" onClick={() => confirmDecision("暂不推进")}>
                暂不推进
              </button>
            </div>
          </div>
        ) : (
          <p className="helperText">运行初筛后，这里会出现可确认的初筛建议。</p>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">审计记录</p>
        <h2>最近操作</h2>
        <div className="auditList">
          {snapshot.auditEvents.slice(0, 8).map((event) => (
            <article key={event.id}>
              <strong>{event.action}</strong>
              <span>{new Date(event.createdAt).toLocaleString("zh-CN")}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
