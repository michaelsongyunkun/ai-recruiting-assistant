export function ComplianceAlerts({ hasVerifiedUserApiConnection }: { hasVerifiedUserApiConnection: boolean }) {
  const alerts = [
    {
      title: hasVerifiedUserApiConnection ? "用户 API 已验证" : "需要用户 API",
      status: hasVerifiedUserApiConnection ? "ok" : "blocked",
      body: hasVerifiedUserApiConnection
        ? "初筛和面试 AI 流程会使用企业自己配置的 API。"
        : "运行初筛或生成面试问题前，请先连接并验证企业自己的模型 API。"
    },
    {
      title: "人工决策门禁",
      status: "ok",
      body: "进入 shortlist、拒绝、安排面试等决定都必须有明确的人工审核人。"
    },
    {
      title: "证据优先评分",
      status: "ok",
      body: "没有简历证据或缺失信息说明的评分会被视为无效。"
    },
    {
      title: "AEDT 合规准备",
      status: "watch",
      body: "如果用于纽约等覆盖地区，请在使用前配置偏见审计摘要和候选人告知。"
    }
  ];

  return (
    <div className="alertGrid">
      {alerts.map((alert) => (
        <article className={`alertCard ${alert.status}`} key={alert.title}>
          <div className="cardEyebrow">{alert.status === "ok" ? "正常" : alert.status === "blocked" ? "阻断" : "关注"}</div>
          <h3>{alert.title}</h3>
          <p>{alert.body}</p>
        </article>
      ))}
    </div>
  );
}
