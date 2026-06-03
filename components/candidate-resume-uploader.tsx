"use client";

import { useEffect, useState } from "react";
import {
  formatResumeParsingReport,
  getResumeParsingReportFileName
} from "../lib/documents/resume-export.js";

type ResumeWorkflow = {
  readyToSave: boolean;
  quality: {
    score: number;
    tone: string;
    summary: string;
  };
  steps: Array<{ id: string; title: string; status: string; detail: string }>;
  checks: Array<{ label: string; status: string; detail: string }>;
  fields: Array<{ label: string; value: string; status: string }>;
};

type ParsedResumeState = {
  profile: any;
  file: File;
  fileName: string;
  workflow: ResumeWorkflow;
  modelConfig?: any;
  productResumeScore?: any;
  scoringStatus?: "idle" | "scoring" | "scored" | "error";
  scoringError?: string;
};

type ExportedReport = {
  url: string;
  fileName: string;
  createdAt: string;
};

type ModelConnection = {
  status: string;
  workflows: string[];
};

const deepseekWorkflowLanes = [
  {
    title: "输入层",
    code: "01",
    nodes: [
      { title: "候选人简历", body: "PDF / DOCX / TXT 上传", meta: "文件进入解析队列" },
      { title: "目标岗位", body: "JD 与岗位评分标准", meta: "作为后续评分上下文" }
    ]
  },
  {
    title: "预处理层",
    code: "02",
    nodes: [
      { title: "文本抽取", body: "抽取可复制文本与基础元数据", meta: "不可读文件直接阻断" },
      { title: "输入清洗", body: "去除空段与异常字符", meta: "保留原文证据" }
    ]
  },
  {
    title: "DeepSeek Agent",
    code: "03",
    emphasized: true,
    nodes: [
      { title: "简历解析大模型节点", body: "System Prompt + Schema JSON", meta: "只基于简历明确信息" },
      { title: "上下文接入", body: "岗位 JD / 评分标准 / 合规规则", meta: "RAG 上下文可扩展" }
    ]
  },
  {
    title: "校验层",
    code: "04",
    nodes: [
      { title: "结构校验", body: "字段完整性与 JSON schema 校验", meta: "失败则要求重跑" },
      { title: "合规护栏", body: "过滤受保护特征与无证据判断", meta: "输出需人工复核" }
    ]
  },
  {
    title: "输出层",
    code: "05",
    nodes: [
      { title: "结构化简历", body: "经历 / 技能 / 项目 / 教育", meta: "可导出查看" },
      { title: "评分与入库", body: "产品岗评分 Agent + 候选人档案", meta: "HR 确认后保存" }
    ]
  }
];

type UploadState =
  | { status: "idle" }
  | { status: "parsing" }
  | ({ status: "parsed" } & ParsedResumeState)
  | ({ status: "saving" } & ParsedResumeState)
  | {
      status: "uploaded";
      profile: any;
      fileName: string;
      candidateId: string;
      workflow: ResumeWorkflow;
      modelConfig?: any;
      productResumeScore?: any;
      scoringStatus?: "idle" | "scoring" | "scored" | "error";
      scoringError?: string;
      screening?: any;
    }
  | { status: "error"; message: string };

function getStatusMeta(state: UploadState) {
  if (state.status === "parsing") return { label: "解析中", tone: "watch" };
  if (state.status === "parsed") return { label: "等待确认保存", tone: state.workflow.quality.tone };
  if (state.status === "saving") return { label: "保存中", tone: "watch" };
  if (state.status === "uploaded") return { label: "已保存候选人", tone: "success" };
  if (state.status === "error") return { label: "解析失败", tone: "blocked" };
  return { label: "等待上传", tone: "watch" };
}

function getWorkflow(state: UploadState) {
  if (state.status === "parsed" || state.status === "saving" || state.status === "uploaded") {
    return state.workflow;
  }
  return null;
}

function getProfile(state: UploadState) {
  if (state.status === "parsed" || state.status === "saving" || state.status === "uploaded") {
    return state.profile;
  }
  return null;
}

function hasWorkflowConnection(modelConnections: ModelConnection[], workflow: string) {
  return modelConnections.some(
    (connection) => connection.status === "verified" && Array.isArray(connection.workflows) && connection.workflows.includes(workflow)
  );
}

function createResumeParsingReportDownload(
  state: Pick<ParsedResumeState, "profile" | "fileName" | "workflow" | "modelConfig">
) {
  const markdown = formatResumeParsingReport({
    profile: state.profile,
    workflow: state.workflow,
    modelConfig: state.modelConfig,
    fileName: state.fileName
  } as any);
  const blob = new Blob(["\ufeff", markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileName = getResumeParsingReportFileName({
    candidateName: state.profile?.name,
    fileName: state.fileName
  });
  return { url, fileName, createdAt: new Date().toISOString() };
}

function DeepSeekResumeWorkflowPrototype({
  workflow,
  resumeParserConnection,
  productResumeScoringConnection,
  screeningConnection
}: {
  workflow: ResumeWorkflow | null;
  resumeParserConnection: boolean;
  productResumeScoringConnection: boolean;
  screeningConnection: boolean;
}) {
  const connectionStatus = [
    { label: "简历解析", connected: resumeParserConnection },
    { label: "产品岗评分", connected: productResumeScoringConnection },
    { label: "岗位初筛", connected: screeningConnection }
  ];

  return (
    <div className="deepseekWorkflowPrototype">
      <div className="prototypeHeader">
        <div>
          <p className="eyebrow">DeepSeek workflow 原型</p>
          <h3>以 DeepSeek 大模型节点为核心的简历解析编排</h3>
        </div>
        <div className="workflowServiceStatus" aria-label="AI workflow 连接状态">
          {connectionStatus.map((item) => (
            <span className={`statusPill ${item.connected ? "success" : "blocked"}`} key={item.label}>
              {item.label}{item.connected ? "可用" : "待连接"}
            </span>
          ))}
        </div>
      </div>

      <div className="workflowCanvas" aria-label="DeepSeek 简历解析 workflow 原型图">
        {deepseekWorkflowLanes.map((lane, laneIndex) => (
          <div className={`workflowLane ${lane.emphasized ? "agentLane" : ""}`} key={lane.title}>
            <div className="workflowLaneHeader">
              <span>{lane.code}</span>
              <strong>{lane.title}</strong>
            </div>
            <div className="workflowNodeStack">
              {lane.nodes.map((node) => (
                <article className="workflowNode" key={node.title}>
                  <strong>{node.title}</strong>
                  <p>{node.body}</p>
                  <span>{node.meta}</span>
                </article>
              ))}
            </div>
            {laneIndex < deepseekWorkflowLanes.length - 1 ? <span className="workflowArrow" aria-hidden="true">→</span> : null}
          </div>
        ))}
      </div>

      <div className="workflowOutcomeStrip">
        <article>
          <span>调用模式</span>
          <strong>用户自有 DeepSeek API</strong>
          <p>未提交并验证 API Key 时，解析、评分和初筛不会启动。</p>
        </article>
        <article>
          <span>输出格式</span>
          <strong>结构化 JSON + 可导出报告</strong>
          <p>解析结果保存到候选人档案，并可进入产品岗评分。</p>
        </article>
        <article>
          <span>当前解析质量</span>
          <strong>{workflow ? `${workflow.quality.score} / 100` : "-- / 100"}</strong>
          <p>{workflow ? workflow.quality.summary : "等待上传简历并调用 DeepSeek 节点。"}</p>
        </article>
      </div>
    </div>
  );
}

export function CandidateResumeUploader({ onImported }: { onImported?: () => void } = {}) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [jobs, setJobs] = useState<any[]>([]);
  const [modelConnections, setModelConnections] = useState<ModelConnection[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [exportedReport, setExportedReport] = useState<ExportedReport | null>(null);
  const statusMeta = getStatusMeta(state);
  const workflow = getWorkflow(state);
  const profile = getProfile(state);
  const resumeParserConnection = hasWorkflowConnection(modelConnections, "resumeParser");
  const productResumeScoringConnection = hasWorkflowConnection(modelConnections, "productResumeScoring");
  const screeningConnection = hasWorkflowConnection(modelConnections, "screening");

  useEffect(() => {
    fetch("/api/workspace")
      .then((response) => response.json())
      .then((payload) => {
        const nextJobs = payload.snapshot?.jobs || [];
        setJobs(nextJobs);
        setModelConnections(payload.snapshot?.modelConnections || []);
        setSelectedJobId((current) => current || nextJobs[0]?.id || "");
      })
      .catch(() => {
        setJobs([]);
        setModelConnections([]);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (exportedReport?.url) URL.revokeObjectURL(exportedReport.url);
    };
  }, [exportedReport?.url]);

  function exportResumeParsingReport(parsedState: Pick<ParsedResumeState, "profile" | "fileName" | "workflow" | "modelConfig">) {
    const report = createResumeParsingReportDownload(parsedState);
    setExportedReport(report);

    const link = document.createElement("a");
    link.href = report.url;
    link.download = report.fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function scoreResume(parsedState: ParsedResumeState) {
    if (!productResumeScoringConnection) {
      setState({
        ...parsedState,
        status: "parsed",
        scoringStatus: "error",
        scoringError: "请先在模型 API 页面提交并验证 API Key，再运行产品岗简历评分。"
      });
      return;
    }

    const scoringState = { ...parsedState, status: "parsed" as const, scoringStatus: "scoring" as const };
    setState(scoringState);

    const response = await fetch("/api/resumes/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: selectedJobId,
        candidateProfile: parsedState.profile
      })
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setState({
        ...scoringState,
        scoringStatus: "error",
        scoringError: payload.message || "产品岗简历评分失败。"
      });
      return;
    }

    setState({
      ...scoringState,
      productResumeScore: payload.score,
      scoringStatus: "scored",
      scoringError: ""
    });
  }

  async function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resumeParserConnection) {
      setState({ status: "error", message: "请先在模型 API 页面提交并验证 API Key，再启动简历解析。" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = formData.get("resume");
    if (!(file instanceof File)) {
      setState({ status: "error", message: "请先选择候选人简历文件。" });
      return;
    }

    setExportedReport(null);
    setState({ status: "parsing" });
    const response = await fetch("/api/resumes/parse", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setState({ status: "error", message: payload.message || "简历解析失败。" });
      return;
    }

    const parsedState = {
      status: "parsed",
      profile: payload.candidateProfile,
      file,
      fileName: payload.file.name,
      workflow: payload.parsingWorkflow,
      modelConfig: payload.modelConfig,
      scoringStatus: "idle"
    } as const;
    setState(parsedState);
  }

  async function saveCandidate() {
    if (state.status !== "parsed") return;
    if (!state.workflow.readyToSave) {
      setState({ status: "error", message: "当前解析结果未通过关键质量检查，请更换简历文本后再保存。" });
      return;
    }
    if (state.scoringStatus !== "scored" || !state.productResumeScore) {
      setState({ status: "error", message: "请先完成 DeepSeek 产品岗简历评分，再保存候选人。" });
      return;
    }

    const parsedState = state;
    setState({ ...parsedState, status: "saving" });
    const formData = new FormData();
    formData.append("resume", parsedState.file);
    formData.append("candidateProfile", JSON.stringify(parsedState.profile));
    if (parsedState.modelConfig) {
      formData.append("parserModelConfig", JSON.stringify(parsedState.modelConfig));
    }
    formData.append("productResumeScore", JSON.stringify(parsedState.productResumeScore));

    const response = await fetch("/api/candidates/import", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setState({ status: "error", message: payload.message || "候选人保存失败。" });
      return;
    }

    setState({
      status: "uploaded",
      profile: payload.candidateProfile,
      fileName: payload.file.name,
      candidateId: payload.candidate.id,
      workflow: payload.parsingWorkflow,
      modelConfig: payload.modelConfig,
      productResumeScore: payload.productResumeScore,
      scoringStatus: "scored"
    });
    onImported?.();
  }

  async function runScreening() {
    if (state.status !== "uploaded") return;
    if (!screeningConnection) {
      setState({
        ...state,
        screening: {
          ok: false,
          message: "请先在模型 API 页面提交并验证 API Key，再运行初筛。"
        }
      });
      return;
    }

    const response = await fetch("/api/screening/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: state.candidateId
      })
    });
    const payload = await response.json();
    setState({ ...state, screening: payload });
  }

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">候选人简历上传</p>
          <h2>嵌入 DeepSeek 简历解析 workflow</h2>
          <p>中间编排层由 DeepSeek 大模型节点、结构化输出校验和 HR 人工复核组成。</p>
        </div>
        <span className={`statusPill ${statusMeta.tone}`}>{statusMeta.label}</span>
      </div>

      <form className="uploadBox" onSubmit={handleParse}>
        <label>
          选择候选人简历
          <input name="resume" type="file" accept=".txt,.pdf,.doc,.docx,text/plain" required />
        </label>
        <button type="submit" disabled={!resumeParserConnection || state.status === "parsing" || state.status === "saving"}>
          {state.status === "parsing" ? "DeepSeek 解析中..." : "调用 DeepSeek 解析"}
        </button>
      </form>
      <div className="settingsGrid resumeJobPicker">
        <label>
          目标岗位
          <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
            {jobs.map((job) => (
              <option value={job.id} key={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="helperText">
        简历解析由已验证的 DeepSeek API 连接驱动；未配置 Key 时不会启动生成功能。
        <a className="textLink" href="/settings/model-api">前往配置</a>
      </p>
      {!resumeParserConnection || !productResumeScoringConnection || !screeningConnection ? (
        <p className="errorText">
          简历解析、产品岗评分和初筛都需要先提交并验证企业自己的 API Key。
          <a className="textLink" href="/settings/model-api">前往模型 API</a>
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="errorText">
          {state.message}
          <a className="textLink" href="/settings/model-api">配置 DeepSeek</a>
        </p>
      ) : null}

      <DeepSeekResumeWorkflowPrototype
        workflow={workflow}
        resumeParserConnection={resumeParserConnection}
        productResumeScoringConnection={productResumeScoringConnection}
        screeningConnection={screeningConnection}
      />

      {profile && workflow ? (
        <div className="parsedResume">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">结构化解析结果</p>
              <h3>{profile.name || "未识别姓名"}</h3>
              <p>{profile.email || "未识别邮箱"}</p>
            </div>
            <span className="statusPill watch">{state.status === "uploaded" ? "已入库" : "待确认"}</span>
          </div>

          <div className="resumeFieldGrid">
            {workflow.fields.map((field) => (
              <article className={`resumeField ${field.status}`} key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </article>
            ))}
          </div>

          <div className="qualityCheckList">
            {workflow.checks.map((item) => (
              <article className={`qualityCheck ${item.status}`} key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          {profile.skills?.length > 0 ? (
            <div className="workflowRow">
              {profile.skills.slice(0, 8).map((skill: any) => (
                <span className="workflowChip" key={skill.name}>
                  {skill.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="resumeActionBar">
            <button className="secondaryButton" type="button" onClick={() => exportResumeParsingReport(state as any)}>
              导出解析结果
            </button>
            {state.status === "parsed" && state.scoringStatus === "idle" ? (
              <button disabled={!productResumeScoringConnection} type="button" onClick={() => scoreResume(state)}>
                运行产品岗简历评分
              </button>
            ) : null}
            {state.status === "parsed" || state.status === "saving" ? (
              <button
                type="button"
                disabled={!workflow.readyToSave || state.status === "saving" || state.scoringStatus !== "scored"}
                onClick={saveCandidate}
              >
                {state.status === "saving" ? "保存中..." : "确认保存候选人"}
              </button>
            ) : null}
            {state.status === "parsed" && state.scoringStatus === "error" ? (
              <button className="secondaryButton" disabled={!productResumeScoringConnection} type="button" onClick={() => scoreResume(state)}>
                重新运行产品岗评分
              </button>
            ) : null}
            {state.status === "uploaded" ? (
              <button disabled={!screeningConnection} type="button" onClick={runScreening}>
                运行初筛
              </button>
            ) : null}
          </div>

          {exportedReport ? (
            <p className="helperText exportNotice">
              解析报告已生成：
              <a className="textLink" href={exportedReport.url} download={exportedReport.fileName}>
                下载 / 重新下载
              </a>
              <span>（{exportedReport.fileName}）</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {(state.status === "parsed" || state.status === "saving" || state.status === "uploaded") ? (
        <ProductResumeScorePanel state={state} />
      ) : null}

      {state.status === "uploaded" && state.screening ? (
        <div className="screeningToast">
          <strong>{state.screening.ok ? "初筛已完成" : "初筛被阻断"}</strong>
          <p>{state.screening.parsed?.summary || state.screening.message}</p>
        </div>
      ) : null}
    </section>
  );
}

function ProductResumeScorePanel({ state }: { state: Extract<UploadState, { status: "parsed" | "saving" | "uploaded" }> }) {
  if (state.scoringStatus === "idle") {
    return (
      <section className="productScorePanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">DeepSeek 评分智能体</p>
            <h2>等待运行产品岗简历评分</h2>
          </div>
          <span className="statusPill watch">待评分</span>
        </div>
        <p className="helperText">简历已完成结构化解析，点击“运行产品岗简历评分”后生成 100 分制初筛评分报告。</p>
      </section>
    );
  }

  if (state.scoringStatus === "scoring") {
    return (
      <section className="productScorePanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">DeepSeek 评分智能体</p>
            <h2>正在进行产品岗简历初筛评分</h2>
          </div>
          <span className="statusPill watch">评分中</span>
        </div>
        <p className="helperText">正在基于岗位描述和候选人简历生成 100 分制评分报告。</p>
      </section>
    );
  }

  if (state.scoringStatus === "error") {
    return (
      <section className="productScorePanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">DeepSeek 评分智能体</p>
            <h2>产品岗简历评分失败</h2>
          </div>
          <span className="statusPill blocked">需处理</span>
        </div>
        <p className="errorText">{state.scoringError}</p>
      </section>
    );
  }

  if (!state.productResumeScore) return null;
  const score = state.productResumeScore;

  return (
    <section className="productScorePanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">DeepSeek 评分智能体</p>
          <h2>产品岗简历初筛评分</h2>
          <p>该结论仅供招聘人员参考，不作为自动录用或淘汰的唯一依据。</p>
        </div>
        <span className="statusPill success">{score.totalScore} / 100</span>
      </div>

      <div className="productScoreSummary">
        <div>
          <span>候选人</span>
          <strong>{score.candidateName}</strong>
        </div>
        <div>
          <span>目标岗位</span>
          <strong>{score.jobTitle}</strong>
        </div>
        <div>
          <span>推荐等级</span>
          <strong>{score.recommendationLevel}</strong>
        </div>
      </div>

      <div className="scoreBar large" aria-hidden="true">
        <span style={{ width: `${score.totalScore}%` }} />
      </div>

      <div className="tableWrap">
        <h3>一、硬性要求检查</h3>
        <table className="table">
          <thead>
            <tr>
              <th>硬性要求</th>
              <th>是否满足</th>
              <th>依据</th>
            </tr>
          </thead>
          <tbody>
            {score.hardRequirements.map((item: any) => (
              <tr key={`${item.requirement}-${item.status}`}>
                <td>{item.requirement}</td>
                <td>{item.status}</td>
                <td>{item.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tableWrap">
        <h3>二、评分明细</h3>
        <table className="table">
          <thead>
            <tr>
              <th>评分维度</th>
              <th>权重</th>
              <th>得分</th>
              <th>评分理由</th>
            </tr>
          </thead>
          <tbody>
            {score.dimensions.map((item: any) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.weight}</td>
                <td>{item.score}</td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid">
        <div className="productScoreList">
          <h3>五、主要匹配点</h3>
          <ul>
            {score.matchingPoints.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="productScoreList">
          <h3>六、主要风险或信息缺口</h3>
          <ul>
            {score.risksOrGaps.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="screeningToast">
        <strong>七、最终初筛建议</strong>
        <p>{score.finalAdvice}</p>
      </div>
    </section>
  );
}
