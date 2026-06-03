import { CandidatesWorkspace } from "../../components/candidates-workspace";

export default function CandidatesPage() {
  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">模块 ② 候选人简历上传</p>
          <h1>上传简历并完成初筛</h1>
          <p>导入候选人简历后，系统会保存候选人档案，并可按岗位标准运行简历初筛。</p>
        </div>
      </header>
      <CandidatesWorkspace />
    </div>
  );
}
