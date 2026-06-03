import { ComplianceAlerts } from "../../components/compliance-alerts";
import { computeSelectionRates } from "../../lib/audit/fairness-metrics.js";
import { demoFairnessRows } from "../../lib/domain/demo-data.js";
import { createRecruitingStore } from "../../lib/server/recruiting-store.js";

export default async function CompliancePage() {
  const connections = await createRecruitingStore().getPublicModelConnections();
  const hasVerifiedUserApiConnection = connections.some((connection: any) => connection.status === "verified");
  const snapshot = computeSelectionRates(demoFairnessRows);

  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">合规</p>
          <h1>审计与公平性看板</h1>
          <p>追踪用户 API 配置、人工审核门禁、候选人告知和聚合选择率。</p>
        </div>
      </header>
      <ComplianceAlerts hasVerifiedUserApiConnection={hasVerifiedUserApiConnection} />
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">公平性快照</p>
            <h2>选择率监控</h2>
          </div>
          <span className="statusPill watch">仅使用自愿提供数据</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>群组</th>
              <th>总数</th>
              <th>入选</th>
              <th>选择率</th>
              <th>影响比率</th>
              <th>样本量</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.groups.map((group: any) => (
              <tr key={group.group}>
                <td>{group.group}</td>
                <td>{group.total}</td>
                <td>{group.selected}</td>
                <td>{group.selectionRate.toFixed(2)}</td>
                <td>{group.impactRatio.toFixed(2)}</td>
                <td>{group.sampleTooSmall ? "样本过小" : "充足"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
