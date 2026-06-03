"use client";

import { useEffect, useMemo, useState } from "react";

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

const workflowStages = [
  {
    href: "/candidates",
    index: "01",
    title: "简历解析与初筛",
    metricKey: "candidates",
    empty: "等待简历导入",
    ready: "候选人已入库"
  },
  {
    href: "/candidates",
    index: "02",
    title: "产品岗简历评分",
    metricKey: "screeningRuns",
    empty: "等待初筛评分",
    ready: "评分报告已生成"
  },
  {
    href: "/interviews",
    index: "03",
    title: "用人经理面试指南",
    metricKey: "interviewGuides",
    empty: "等待问题生成",
    ready: "面试方案已生成"
  },
  {
    href: "/results",
    index: "04",
    title: "综合面试结果",
    metricKey: "interviewConfirmations",
    empty: "等待结果确认",
    ready: "结果已确认"
  }
];

const workbenchCards = [
  {
    href: "/jobs",
    label: "岗位库",
    title: "岗位标准配置",
    body: "维护岗位 JD、硬性要求和人工审批后的评分标准。"
  },
  {
    href: "/settings/model-api",
    label: "模型连接",
    title: "企业自有模型 API",
    body: "管理 DeepSeek API 连接、本地凭据和 AI workflow 可用状态。"
  },
  {
    href: "/results",
    label: "决策看板",
    title: "简历分与面试分合并",
    body: "由 HR 设置权重，输出综合分、推荐等级和复核提示。"
  }
];

function countByKey(snapshot: Snapshot, key: string) {
  return Number((snapshot as any)[key]?.length || 0);
}

export function HomeWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [status, setStatus] = useState("正在加载本地招聘数据...");

  useEffect(() => {
    fetch("/api/workspace")
      .then((response) => response.json())
      .then((payload) => {
        setSnapshot(payload.snapshot);
        setStatus("本地数据已同步");
      })
      .catch(() => setStatus("本地服务未响应"));
  }, []);

  const latestCandidate = useMemo(() => snapshot.candidates[0], [snapshot.candidates]);
  const latestScreeningRun = useMemo(() => snapshot.screeningRuns[0], [snapshot.screeningRuns]);
  const latestInterviewGuide = useMemo(() => snapshot.interviewGuides[0], [snapshot.interviewGuides]);
  const latestSummary = useMemo(() => snapshot.interviewSummaries[0], [snapshot.interviewSummaries]);
  const latestConfirmation = useMemo(() => snapshot.interviewConfirmations[0], [snapshot.interviewConfirmations]);

  const totalCompleted =
    Number(Boolean(latestCandidate)) +
    Number(Boolean(latestScreeningRun)) +
    Number(Boolean(latestInterviewGuide)) +
    Number(Boolean(latestSummary || latestConfirmation));

  return (
    <div className="stack">
      <section className="opsHero">
        <div className="opsHeroCopy">
          <p className="eyebrow">Recruiting Operations</p>
          <h1>企业招聘智能工作台</h1>
          <p>以岗位标准为中心，串联候选人档案、简历评分、面试评分和最终复核。</p>
        </div>
        <div className="opsHealthPanel">
          <span>Pipeline</span>
          <strong>{totalCompleted}/4</strong>
          <p>{status}</p>
        </div>
      </section>

      <section className="opsMetricGrid" aria-label="招聘数据概览">
        <article>
          <span>候选人</span>
          <strong>{snapshot.candidates.length}</strong>
          <small>{latestCandidate ? latestCandidate.name : "暂无候选人"}</small>
        </article>
        <article>
          <span>岗位</span>
          <strong>{snapshot.jobs.length}</strong>
          <small>已配置岗位库</small>
        </article>
        <article>
          <span>简历初筛</span>
          <strong>{snapshot.screeningRuns.length}</strong>
          <small>{latestScreeningRun ? `最近得分 ${latestScreeningRun.result?.overallScore ?? "-"}` : "暂无评分"}</small>
        </article>
        <article>
          <span>面试结论</span>
          <strong>{snapshot.interviewConfirmations.length}</strong>
          <small>{latestConfirmation?.decision || latestSummary?.status || "暂无结论"}</small>
        </article>
      </section>

      <section className="workbenchGrid">
        <div className="panel commandCenter">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">流程控制</p>
              <h2>招聘 workflow</h2>
            </div>
            <span className="statusPill watch">{status}</span>
          </div>
          <div className="workflowFunnel">
            {workflowStages.map((stage) => {
              const count = countByKey(snapshot, stage.metricKey);
              return (
                <a className={count > 0 ? "funnelStage done" : "funnelStage"} href={stage.href} key={stage.index}>
                  <span className="stageIndex">{stage.index}</span>
                  <strong>{stage.title}</strong>
                  <small>{count > 0 ? stage.ready : stage.empty}</small>
                </a>
              );
            })}
          </div>
        </div>

        <aside className="panel activityLedger">
          <p className="eyebrow">最近状态</p>
          <h2>候选人流转</h2>
          <div className="ledgerList">
            <article className={latestCandidate ? "ledgerItem done" : "ledgerItem"}>
              <span>简历</span>
              <strong>{latestCandidate ? latestCandidate.name : "等待导入"}</strong>
            </article>
            <article className={latestScreeningRun ? "ledgerItem done" : "ledgerItem"}>
              <span>初筛</span>
              <strong>{latestScreeningRun ? `得分 ${latestScreeningRun.result?.overallScore ?? "-"}` : "等待评分"}</strong>
            </article>
            <article className={latestInterviewGuide ? "ledgerItem done" : "ledgerItem"}>
              <span>面试</span>
              <strong>{latestInterviewGuide?.status || "等待生成"}</strong>
            </article>
            <article className={latestSummary || latestConfirmation ? "ledgerItem done" : "ledgerItem"}>
              <span>结果</span>
              <strong>{latestConfirmation?.decision || latestSummary?.status || "等待确认"}</strong>
            </article>
          </div>
        </aside>
      </section>

      <section className="moduleGrid" aria-label="系统工作区">
        {workbenchCards.map((card) => (
          <a className="moduleCard" href={card.href} key={card.href}>
            <p className="eyebrow">{card.label}</p>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <span>打开</span>
          </a>
        ))}
      </section>
    </div>
  );
}
