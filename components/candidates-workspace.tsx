"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidateResumeUploader } from "./candidate-resume-uploader";

type CandidatesSnapshot = {
  candidates: any[];
};

export function CandidatesWorkspace() {
  const [snapshot, setSnapshot] = useState<CandidatesSnapshot>({ candidates: [] });
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [status, setStatus] = useState("正在加载候选人...");
  const selectedCandidate = useMemo(
    () => snapshot.candidates.find((candidate) => candidate.id === selectedCandidateId) || null,
    [snapshot.candidates, selectedCandidateId]
  );

  async function refresh(message?: string) {
    const response = await fetch("/api/workspace");
    const payload = await response.json();
    setSnapshot({ candidates: payload.snapshot.candidates || [] });
    setStatus(message || "候选人列表已更新。");
  }

  useEffect(() => {
    refresh("候选人列表已加载。").catch(() => setStatus("加载候选人失败，请确认本地服务正在运行。"));
  }, []);

  async function deleteCandidate(candidate: any) {
    const confirmed = window.confirm(`确认删除候选人「${candidate.name}」？相关初筛和面试记录也会一并删除。`);
    if (!confirmed) return;

    const response = await fetch(`/api/candidates/${candidate.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.message || "删除候选人失败。");
      return;
    }
    if (selectedCandidateId === candidate.id) {
      setSelectedCandidateId("");
    }
    await refresh(`已删除候选人：${candidate.name}。`);
  }

  return (
    <div className="stack">
      <CandidateResumeUploader onImported={() => refresh("候选人已上传并加入列表。")} />
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">候选人库</p>
            <h2>已导入候选人</h2>
          </div>
          <span className="statusPill success">{snapshot.candidates.length} 位候选人</span>
        </div>
        <p className="helperText">{status}</p>
        <div className="managementList">
          {snapshot.candidates.length === 0 ? (
            <p className="helperText">暂无候选人。请先上传候选人简历。</p>
          ) : (
            snapshot.candidates.map((candidate) => (
              <article key={candidate.id}>
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.email || "未识别邮箱"}</p>
                  <span className="statusPill watch">{candidate.stage}</span>
                  <div className="workflowRow">
                    {(candidate.profile?.skills || []).slice(0, 6).map((skill: any) => (
                      <span className="workflowChip" key={skill.name}>
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="buttonRow">
                  <button className="secondaryButton" type="button" onClick={() => setSelectedCandidateId(candidate.id)}>
                    查看档案
                  </button>
                  <button className="dangerButton" type="button" onClick={() => deleteCandidate(candidate)}>
                    删除候选人
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        {selectedCandidate ? (
          <CandidateProfilePanel candidate={selectedCandidate} onClose={() => setSelectedCandidateId("")} />
        ) : null}
      </section>
    </div>
  );
}

function valueText(value: any, fallback = "未提供") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function CandidateProfilePanel({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const parsedProfile = candidate.resume?.parsedProfile || candidate.profile || {};
  const productResumeScore = candidate.resume?.productResumeScore || candidate.productResumeScore || null;
  const workHistory = parsedProfile.workHistory || [];
  const projects = parsedProfile.projects || [];
  const education = parsedProfile.education || [];
  const skills = parsedProfile.skills || [];

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">候选人档案详情</p>
          <h2>{candidate.name}</h2>
          <p>{candidate.email || "未识别邮箱"}</p>
        </div>
        <button className="secondaryButton" type="button" onClick={onClose}>
          关闭档案
        </button>
      </div>

      <div className="metricRow">
        <div>
          <strong>{valueText(parsedProfile.phone)}</strong>
          <span>电话</span>
        </div>
        <div>
          <strong>{valueText(parsedProfile.location)}</strong>
          <span>地区</span>
        </div>
        <div>
          <strong>{valueText(candidate.stage)}</strong>
          <span>阶段</span>
        </div>
        <div>
          <strong>{productResumeScore ? `${productResumeScore.totalScore} / 100` : "待评分"}</strong>
          <span>简历评分</span>
        </div>
      </div>

      {productResumeScore ? (
        <div className="screeningToast">
          <strong>{productResumeScore.recommendationLevel}</strong>
          <p>{productResumeScore.finalAdvice}</p>
        </div>
      ) : (
        <p className="helperText">该候选人还没有保存产品岗简历评分。</p>
      )}

      <div className="grid">
        <section className="panel">
          <p className="eyebrow">解析档案</p>
          <h2>技能与项目</h2>
          <div className="workflowRow">
            {skills.length === 0 ? (
              <span className="workflowChip">暂无技能</span>
            ) : (
              skills.map((skill: any) => (
                <span className="workflowChip" key={`${skill.name}-${skill.evidence}`}>
                  {skill.name}
                </span>
              ))
            )}
          </div>
          <div className="resultList">
            {projects.length === 0 ? (
              <article>
                <strong>项目经历</strong>
                <span>暂无项目解析结果</span>
              </article>
            ) : (
              projects.map((project: any) => (
                <article key={`${project.name}-${project.role}`}>
                  <strong>{project.name || "未命名项目"}</strong>
                  <span>{project.summary || project.evidence || "未提供项目摘要"}</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">工作经历</p>
          <h2>履历摘要</h2>
          <div className="resultList">
            {workHistory.length === 0 ? (
              <article>
                <strong>工作经历</strong>
                <span>暂无工作经历解析结果</span>
              </article>
            ) : (
              workHistory.map((item: any) => (
                <article key={`${item.company}-${item.title}-${item.startDate}`}>
                  <strong>
                    {item.company || "未知公司"} / {item.title || "未知职位"}
                  </strong>
                  <span>
                    {valueText(item.startDate, "未知开始")} - {valueText(item.endDate, "未知结束")}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="tableWrap">
        <h3>教育经历</h3>
        <table className="table">
          <thead>
            <tr>
              <th>学校</th>
              <th>学历/专业</th>
              <th>时间</th>
              <th>依据</th>
            </tr>
          </thead>
          <tbody>
            {education.length === 0 ? (
              <tr>
                <td colSpan={4}>暂无教育经历解析结果</td>
              </tr>
            ) : (
              education.map((item: any) => (
                <tr key={`${item.institution}-${item.credential}-${item.date}`}>
                  <td>{valueText(item.institution)}</td>
                  <td>{valueText(item.credential)}</td>
                  <td>{valueText(item.date)}</td>
                  <td>{valueText(item.evidence)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
