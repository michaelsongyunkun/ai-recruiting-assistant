"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateFinalInterviewResult } from "../lib/domain/final-results.js";

type Snapshot = {
  jobs: any[];
  candidates: any[];
  screeningRuns: any[];
  interviewGuides: any[];
  interviewSummaries: any[];
  interviewConfirmations: any[];
};

const emptySnapshot: Snapshot = {
  jobs: [],
  candidates: [],
  screeningRuns: [],
  interviewGuides: [],
  interviewSummaries: [],
  interviewConfirmations: []
};

function formatScore(score: number | null) {
  return score === null ? "待评分" : `${score} / 100`;
}

export function InterviewResultsWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [resumeWeight, setResumeWeight] = useState(40);
  const [interviewWeight, setInterviewWeight] = useState(60);
  const [status, setStatus] = useState("正在加载结果数据...");

  async function refresh(message?: string) {
    const response = await fetch("/api/workspace");
    const payload = await response.json();
    setSnapshot(payload.snapshot);
    setSelectedJobId((current) => current || payload.snapshot.jobs[0]?.id || "");
    setSelectedCandidateId((current) => current || payload.snapshot.candidates[0]?.id || "");
    setStatus(message || "结果数据已更新。");
  }

  useEffect(() => {
    refresh("结果数据已加载。").catch(() => setStatus("加载失败，请确认本地服务正在运行。"));
  }, []);

  const selectedJob = useMemo(
    () => snapshot.jobs.find((job) => job.id === selectedJobId) || snapshot.jobs[0],
    [snapshot.jobs, selectedJobId]
  );
  const selectedCandidate = useMemo(
    () => snapshot.candidates.find((candidate) => candidate.id === selectedCandidateId) || snapshot.candidates[0],
    [snapshot.candidates, selectedCandidateId]
  );
  const latestGuide = useMemo(
    () =>
      snapshot.interviewGuides.find(
        (guide) => guide.jobId === selectedJob?.id && guide.candidateId === selectedCandidate?.id
      ) ||
      snapshot.interviewGuides.find((guide) => guide.candidateId === selectedCandidate?.id) ||
      null,
    [snapshot.interviewGuides, selectedJob?.id, selectedCandidate?.id]
  );
  const latestSummary = useMemo(
    () =>
      snapshot.interviewSummaries.find(
        (summary) => summary.jobId === selectedJob?.id && summary.candidateId === selectedCandidate?.id
      ) ||
      snapshot.interviewSummaries.find((summary) => summary.candidateId === selectedCandidate?.id) ||
      null,
    [snapshot.interviewSummaries, selectedJob?.id, selectedCandidate?.id]
  );
  const latestConfirmation = useMemo(
    () =>
      snapshot.interviewConfirmations.find(
        (confirmation) => confirmation.jobId === selectedJob?.id && confirmation.candidateId === selectedCandidate?.id
      ) ||
      snapshot.interviewConfirmations.find((confirmation) => confirmation.candidateId === selectedCandidate?.id) ||
      null,
    [snapshot.interviewConfirmations, selectedJob?.id, selectedCandidate?.id]
  );
  const resume = selectedCandidate?.resume || {};
  const resumeScore = resume.productResumeScore?.totalScore ?? selectedCandidate?.productResumeScore?.totalScore ?? null;
  const resumeScoreSummary =
    resume.productResumeScore?.finalAdvice ||
    resume.productResumeScore?.recommendationLevel ||
    "完成候选人简历评分后会自动读取这里的分数。";
  const interviewScore = latestSummary?.result?.finalInterviewScore ?? null;
  const interviewScoreSummary = latestSummary?.result?.summary || "完成面试评分后会自动读取这里的分数。";
  const result = calculateFinalInterviewResult({
    resumeScore,
    interviewScore,
    resumeWeight,
    interviewWeight
  });

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">结果对象</p>
            <h2>选择候选人和岗位</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={() => refresh()}>
            刷新数据
          </button>
        </div>
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
          <label>
            简历分占比
            <input
              max="100"
              min="0"
              type="number"
              value={resumeWeight}
              onChange={(event) => setResumeWeight(Number(event.target.value))}
            />
          </label>
          <label>
            面试分占比
            <input
              max="100"
              min="0"
              type="number"
              value={interviewWeight}
              onChange={(event) => setInterviewWeight(Number(event.target.value))}
            />
          </label>
        </div>
        <p className="helperText">{status}</p>
      </section>

      <section className="resultGrid">
        <article className="panel resultScorePanel">
          <p className="eyebrow">简历得分</p>
          <strong>{formatScore(result.resumeScore)}</strong>
          <div className="scoreBar" aria-hidden="true">
            <span style={{ width: `${result.resumeScore || 0}%` }} />
          </div>
          <p>{resumeScoreSummary}</p>
        </article>
        <article className="panel resultScorePanel">
          <p className="eyebrow">面试得分</p>
          <strong>{formatScore(result.interviewScore)}</strong>
          <div className="scoreBar" aria-hidden="true">
            <span style={{ width: `${result.interviewScore || 0}%` }} />
          </div>
          <p>{interviewScoreSummary}</p>
        </article>
        <article className="panel finalDecisionPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">综合判断</p>
              <h2>{result.decision}</h2>
            </div>
            <span className={`statusPill ${result.tone}`}>{result.finalScore === null ? "待完成" : `${result.finalScore} 分`}</span>
          </div>
          <div className="scoreBar large" aria-hidden="true">
            <span style={{ width: `${result.finalScore || 0}%` }} />
          </div>
          <p>{result.summary}</p>
          <p className="helperText">
            当前权重：简历分占比 {resumeWeight}%，面试分占比 {interviewWeight}%。
          </p>
        </article>
      </section>

      <div className="grid">
        <section className="panel">
          <p className="eyebrow">面试材料</p>
          <h2>问题与总结</h2>
          <div className="resultList">
            <article>
              <strong>面试问题</strong>
              <span>{latestGuide ? latestGuide.status : "尚未生成"}</span>
            </article>
            <article>
              <strong>面试评分</strong>
              <span>
                {latestSummary?.result?.finalInterviewScore !== undefined
                  ? `${latestSummary.result.finalInterviewScore} / 100`
                  : "尚未生成"}
              </span>
            </article>
            <article>
              <strong>人工确认</strong>
              <span>{latestConfirmation ? latestConfirmation.decision : "尚未确认"}</span>
            </article>
          </div>
        </section>
        <section className="panel">
          <p className="eyebrow">分数来源</p>
          <h2>自动接入</h2>
          <div className="resultList">
            <article>
              <strong>候选人简历评分</strong>
              <span>{formatScore(result.resumeScore)}</span>
            </article>
            <article>
              <strong>面试问题生成板块评分</strong>
              <span>{formatScore(result.interviewScore)}</span>
            </article>
          </div>
          <div className="buttonRow">
            <a className="secondaryLink compact" href="/interviews">
              返回面试问题
            </a>
            <a className="secondaryLink compact" href="/candidates">
              返回简历上传
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
