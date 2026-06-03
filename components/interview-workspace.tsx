"use client";

import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  jobs: any[];
  candidates: any[];
  screeningRuns: any[];
  interviewGuides: any[];
  interviewNotes: any[];
  interviewSummaries: any[];
  interviewConfirmations: any[];
  modelConnections: any[];
};

const emptySnapshot: Snapshot = {
  jobs: [],
  candidates: [],
  screeningRuns: [],
  interviewGuides: [],
  interviewNotes: [],
  interviewSummaries: [],
  interviewConfirmations: [],
  modelConnections: []
};

const interviewTypeLabels: Record<string, string> = {
  recruiter_screen: "招聘初聊",
  technical: "专业面试",
  behavioral: "行为面试",
  hiring_manager: "用人经理面试"
};

export function InterviewWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [status, setStatus] = useState("正在加载面试工作台...");
  const [authorName, setAuthorName] = useState("面试官李四");
  const [reviewerName, setReviewerName] = useState("HR 张三");
  const [questionCount, setQuestionCount] = useState(5);
  const [focusRequirements, setFocusRequirements] = useState("");
  const [isScoringInterview, setIsScoringInterview] = useState(false);

  const selectedJob = useMemo(
    () => snapshot.jobs.find((job) => job.id === selectedJobId) || snapshot.jobs[0],
    [snapshot.jobs, selectedJobId]
  );
  const selectedCandidate = useMemo(
    () => snapshot.candidates.find((candidate) => candidate.id === selectedCandidateId) || snapshot.candidates[0],
    [snapshot.candidates, selectedCandidateId]
  );
  const latestScreeningRun = useMemo(
    () =>
      snapshot.screeningRuns.find(
        (run) => run.jobId === selectedJob?.id && run.candidateId === selectedCandidate?.id
      ) || snapshot.screeningRuns.find((run) => run.candidateId === selectedCandidate?.id),
    [snapshot.screeningRuns, selectedJob?.id, selectedCandidate?.id]
  );
  const selectedGuide = useMemo(
    () =>
      snapshot.interviewGuides.find((guide) => guide.id === selectedGuideId) ||
      snapshot.interviewGuides.find(
        (guide) => guide.jobId === selectedJob?.id && guide.candidateId === selectedCandidate?.id
      ),
    [snapshot.interviewGuides, selectedGuideId, selectedJob?.id, selectedCandidate?.id]
  );
  const notes = useMemo(
    () => snapshot.interviewNotes.filter((note) => note.interviewGuideId === selectedGuide?.id),
    [snapshot.interviewNotes, selectedGuide?.id]
  );
  const latestSummary = useMemo(
    () => snapshot.interviewSummaries.find((summary) => summary.interviewGuideId === selectedGuide?.id),
    [snapshot.interviewSummaries, selectedGuide?.id]
  );
  const guideConnection = snapshot.modelConnections.find(
    (connection) => connection.status === "verified" && connection.workflows?.includes("interviewGuide")
  );
  const summaryConnection = snapshot.modelConnections.find(
    (connection) => connection.status === "verified" && connection.workflows?.includes("interviewSummary")
  );
  const criterionNames = new Map((selectedJob?.criteria || []).map((criterion: any) => [criterion.id, criterion.name]));
  const selectedGuideResult = selectedGuide?.result || null;
  const isHiringManagerGuide = Boolean(selectedGuideResult?.questionCount && selectedGuideResult?.scoringSheet);

  async function refresh(message?: string) {
    const response = await fetch("/api/workspace");
    const payload = await response.json();
    setSnapshot(payload.snapshot);
    setSelectedJobId((current) => current || payload.snapshot.jobs[0]?.id || "");
    setSelectedCandidateId((current) => current || payload.snapshot.candidates[0]?.id || "");
    setSelectedGuideId((current) => current || payload.snapshot.interviewGuides[0]?.id || "");
    setStatus(message || "面试工作台已更新。");
  }

  useEffect(() => {
    refresh("面试工作台已加载。").catch(() => setStatus("加载失败，请确认本地服务正在运行。"));
  }, []);

  async function generateGuide() {
    if (!selectedJob || !selectedCandidate) {
      setStatus("请先选择岗位和候选人。");
      return;
    }
    if (!guideConnection) {
      setStatus("请先在设置中验证面试题生成 API。");
      return;
    }
    if (!Number.isInteger(questionCount) || questionCount < 3 || questionCount > 8) {
      setStatus("所需问题数量必须为 3-8 之间的整数。");
      return;
    }
    const response = await fetch("/api/interviews/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: selectedJob.id,
        candidateId: selectedCandidate.id,
        screeningRunId: latestScreeningRun?.id,
        questionCount,
        focusRequirements
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "生成面试指南失败。");
      return;
    }
    setSelectedGuideId(payload.interviewGuide.id);
    await refresh("用人经理面试指南已生成并保存。");
  }

  async function scoreInterview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!selectedGuide) {
      setStatus("请先生成面试指南。");
      return;
    }
    if (!summaryConnection) {
      setStatus("请先在设置中验证面试评分 API。");
      return;
    }
    const form = new FormData(formElement);
    const candidateAnswer = String(form.get("content") || "").trim();
    if (!candidateAnswer) {
      setStatus("请先填写候选人面试回答。");
      return;
    }
    setIsScoringInterview(true);
    const response = await fetch(`/api/interviews/${selectedGuide.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName,
        content: candidateAnswer
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setIsScoringInterview(false);
      setStatus(payload.message || "保存候选人面试回答失败。");
      return;
    }
    const scoreResponse = await fetch(`/api/interviews/${selectedGuide.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteIds: [payload.note.id] })
    });
    const scorePayload = await scoreResponse.json();
    setIsScoringInterview(false);
    if (!scoreResponse.ok || !scorePayload.ok) {
      setStatus(scorePayload.message || "面试评分失败。");
      return;
    }
    await refresh("面试评分已生成，等待人工确认。");
    formElement.reset();
  }

  async function generateSummary() {
    if (!selectedGuide) {
      setStatus("请先生成面试指南。");
      return;
    }
    if (notes.length === 0) {
      setStatus("请先录入候选人面试回答。");
      return;
    }
    if (!summaryConnection) {
      setStatus("请先在设置中验证面试评分 API。");
      return;
    }
    const response = await fetch(`/api/interviews/${selectedGuide.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteIds: notes.map((note) => note.id) })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "生成面试评分失败。");
      return;
    }
    await refresh("面试评分已生成，等待人工确认。");
  }

  async function confirmSummary(decision: string) {
    if (!selectedGuide || !latestSummary) {
      setStatus("请先生成面试总结。");
      return;
    }
    const response = await fetch(`/api/interviews/${selectedGuide.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewSummaryId: latestSummary.id,
        reviewerName,
        decision,
        note: `${decision}：由 ${reviewerName} 确认。`
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "确认面试总结失败。");
      return;
    }
    await refresh(`已确认：${decision}。`);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Sprint 3</p>
            <h2>真实面试闭环</h2>
            <p>从初筛结果生成面试指南，录入候选人回答，再生成可审计的面试评分。</p>
          </div>
          <span className={`statusPill ${guideConnection && summaryConnection ? "success" : "blocked"}`}>
            {guideConnection && summaryConnection ? "面试 API 已验证" : "需要连接面试 API"}
          </span>
        </div>
        <div className="metricRow">
          <div>
            <strong>{snapshot.interviewGuides.length}</strong>
            <span>面试指南</span>
          </div>
          <div>
            <strong>{snapshot.interviewNotes.length}</strong>
            <span>候选人回答</span>
          </div>
          <div>
            <strong>{snapshot.interviewSummaries.length}</strong>
            <span>面试总结</span>
          </div>
          <div>
            <strong>{snapshot.interviewConfirmations.length}</strong>
            <span>人工确认</span>
          </div>
        </div>
        <p className="helperText">{status}</p>
      </section>

      <div className="grid">
        <section className="panel">
          <p className="eyebrow">第一步</p>
          <h2>选择面试对象</h2>
          <div className="formStack">
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
            <label>
              所需问题数量
              <input
                max={8}
                min={3}
                type="number"
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              />
            </label>
            <label>
              可选补充要求
              <textarea
                rows={3}
                value={focusRequirements}
                onChange={(event) => setFocusRequirements(event.target.value)}
                placeholder="例如：重点考察数据能力、增长经验、B端产品经验、AI产品经验、项目推进能力。"
              />
            </label>
            <button disabled={!selectedJob || !selectedCandidate || !guideConnection} type="button" onClick={generateGuide}>
              生成用人经理面试指南
            </button>
          </div>
          {!guideConnection ? (
            <p className="helperText">
              面试题生成需要企业自己的 API。<a className="textLink" href="/settings/model-api">前往设置</a>
            </p>
          ) : null}
        </section>

        <section className="panel">
          <p className="eyebrow">第二步</p>
          <h2>进行面试评分</h2>
          <form className="formStack" onSubmit={scoreInterview}>
            <label>
              面试官
              <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
            </label>
            <label>
              候选人面试回答
              <textarea name="content" rows={5} placeholder="粘贴或记录候选人针对面试问题的回答、案例、数据和复盘细节。" required />
            </label>
            <button disabled={!selectedGuide || !summaryConnection || isScoringInterview} type="submit">
              {isScoringInterview ? "正在评分..." : "进行面试评分"}
            </button>
          </form>
          {!summaryConnection ? (
            <p className="helperText">
              面试评分需要企业自己的 API。<a className="textLink" href="/settings/model-api">前往设置</a>
            </p>
          ) : null}
        </section>
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">面试指南</p>
            <h2>
              {selectedGuide
                ? isHiringManagerGuide
                  ? "用人经理面试指南"
                  : `${interviewTypeLabels[selectedGuide.result.interviewType] || selectedGuide.result.interviewType}指南`
                : "尚未生成"}
            </h2>
          </div>
          <span className={`statusPill ${selectedGuide ? "success" : "watch"}`}>
            {selectedGuide?.status || "等待生成"}
          </span>
        </div>
        {selectedGuide ? (
          isHiringManagerGuide ? (
            <div className="questionList">
              <div className="screeningToast">
                <strong>
                  {selectedGuideResult.candidateName} / {selectedGuideResult.jobTitle}
                </strong>
                <p>所需问题数量：{selectedGuideResult.questionCount}</p>
                <p>{selectedGuideResult.evidenceBasis}</p>
              </div>
              {(selectedGuideResult.questions || []).map((question: any) => (
                <article className="questionCard" key={`${question.sequence}-${question.question}`}>
                  <p className="eyebrow">
                    第 {question.sequence} 题 · {question.questionType} · {question.weight} 分
                  </p>
                  <h3>{question.question}</h3>
                  <div className="twoCol">
                    <p>
                      <strong>考察维度：</strong> {question.dimension}
                    </p>
                    <p>
                      <strong>简历/岗位依据：</strong> {question.evidence}
                    </p>
                  </div>
                  <div className="tableWrap">
                    <h3>单题评分标准</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>5分表现</th>
                          <th>3分表现</th>
                          <th>1分表现</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{question.score5}</td>
                          <td>{question.score3}</td>
                          <td>{question.score1}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
              <div className="tableWrap">
                <h3>面试评分表</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>权重</th>
                      <th>面试官评分</th>
                      <th>单题加权得分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGuideResult.scoringSheet || []).map((row: any) => (
                      <tr key={row.sequence}>
                        <td>{row.sequence}</td>
                        <td>{row.weight}</td>
                        <td>{row.interviewerScore ?? "待评分"}</td>
                        <td>{row.weightedScore ?? "待计算"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="helperText">{selectedGuideResult.scoringMethod}</p>
              </div>
              <div className="screeningToast">
                <strong>{selectedGuideResult.recommendationLevel}</strong>
                <p>{selectedGuideResult.conclusionSummary}</p>
              </div>
            </div>
          ) : (
            <div className="questionList">
              <p>{selectedGuide.result.openingScript}</p>
              {(selectedGuide.result.questions || []).map((question: any) => (
                <article className="questionCard" key={question.question}>
                  <p className="eyebrow">{criterionNames.get(question.criterionId) || question.criterionId}</p>
                  <h3>{question.question}</h3>
                  <div className="twoCol">
                    <p>
                      <strong>强信号：</strong> {question.strongSignal}
                    </p>
                    <p>
                      <strong>弱信号：</strong> {question.weakSignal}
                    </p>
                  </div>
                  <ul>
                    {(question.followUps || []).map((followUp: string) => (
                      <li key={followUp}>{followUp}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )
        ) : (
          <p className="helperText">生成面试指南后，这里会显示结构化问题和信号判断。</p>
        )}
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">第三步</p>
            <h2>AI 面试评分与人工确认</h2>
          </div>
          <button disabled={!selectedGuide || notes.length === 0 || !summaryConnection} type="button" onClick={generateSummary}>
            重新进行面试评分
          </button>
        </div>
        {!summaryConnection ? (
          <p className="helperText">
            面试评分需要企业自己的 API。<a className="textLink" href="/settings/model-api">前往设置</a>
          </p>
        ) : null}
        <div className="noteList">
          {notes.map((note) => (
            <article key={note.id}>
              <strong>{note.authorName}</strong>
              <p>{note.content}</p>
              <span>{new Date(note.createdAt).toLocaleString("zh-CN")}</span>
            </article>
          ))}
        </div>
        {latestSummary ? (
          <div className="screeningToast">
            <strong>{latestSummary.result.summary}</strong>
            {latestSummary.result.finalInterviewScore !== undefined ? (
              <p>
                面试得分：{latestSummary.result.finalInterviewScore} / 100 · {latestSummary.result.recommendationLevel}
              </p>
            ) : null}
            <p>状态：{latestSummary.status}</p>
            {Array.isArray(latestSummary.result.scoringSheet) ? (
              <div className="tableWrap">
                <h3>AI 逐题评分</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>权重</th>
                      <th>原始分</th>
                      <th>加权分</th>
                      <th>评分理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestSummary.result.scoringSheet.map((row: any) => (
                      <tr key={row.sequence}>
                        <td>{row.sequence}</td>
                        <td>{row.weight}</td>
                        <td>{row.interviewerScore}</td>
                        <td>{row.weightedScore}</td>
                        <td>{row.scoringReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="workflowRow">
              {(latestSummary.result.hiringSignals || []).map((signal: string) => (
                <span className="workflowChip" key={signal}>
                  {signal}
                </span>
              ))}
            </div>
            <label className="reviewerInput">
              确认人
              <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} />
            </label>
            <div className="decisionRow">
              <button type="button" onClick={() => confirmSummary("建议推进下一轮")}>
                建议推进下一轮
              </button>
              <button type="button" onClick={() => confirmSummary("待补充信息")}>
                待补充信息
              </button>
              <button type="button" onClick={() => confirmSummary("暂不推进")}>
                暂不推进
              </button>
            </div>
          </div>
        ) : (
          <p className="helperText">录入候选人面试回答并点击“进行面试评分”后，这里会显示 AI 评分结果和人工确认入口。</p>
        )}
      </section>
    </div>
  );
}
