import { JobsWorkspace } from "../../components/jobs-workspace";

export default function JobsPage() {
  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">岗位</p>
          <h1>已审批岗位评分标准</h1>
          <p>只有人工审批岗位相关标准和评分锚点后，系统才允许运行初筛。</p>
        </div>
      </header>
      <JobsWorkspace />
    </div>
  );
}
