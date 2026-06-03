import { summarizeScreeningResult, validateScreeningRecommendation } from "../lib/domain/screening.js";

export function ScreeningResultPanel({ recommendation, criteria }: { recommendation: any; criteria: any[] }) {
  const validation = validateScreeningRecommendation(recommendation);
  const summary = summarizeScreeningResult(recommendation);
  const names = new Map(criteria.map((criterion) => [criterion.id, criterion.name]));

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">AI 初筛建议</p>
          <h2>{recommendation.summary}</h2>
        </div>
        <span className={`statusPill ${validation.valid ? "success" : "blocked"}`}>
          {validation.valid ? "证据有效" : "需要复核"}
        </span>
      </div>

      <div className="metricRow">
        <div>
          <strong>{recommendation.overallScore}</strong>
          <span>综合评分</span>
        </div>
        <div>
          <strong>{summary.evidenceCount}</strong>
          <span>有证据的标准</span>
        </div>
        <div>
          <strong>{summary.missingInformationCount}</strong>
          <span>缺失信息</span>
        </div>
      </div>

      <div className="criterionList">
        {recommendation.criteria.map((criterion: any) => (
          <article key={criterion.criterionId} className="criterionRow">
            <div>
              <h3>{names.get(criterion.criterionId) ?? criterion.criterionId}</h3>
              <p>置信度：{criterion.confidence}</p>
            </div>
            <strong>{criterion.score}/4</strong>
            <ul>
              {criterion.evidence.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
              {criterion.missingInformation.map((item: string) => (
                <li key={item}>缺失：{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
