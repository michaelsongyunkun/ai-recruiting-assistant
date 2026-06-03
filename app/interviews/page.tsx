import { InterviewWorkspace } from "../../components/interview-workspace";

export default function InterviewsPage() {
  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">模块 ③ 面试问题生成</p>
          <h1>用人经理面试指南</h1>
          <p>选择候选人与岗位后，系统会结合已解析简历和岗位描述生成结构化面试问题与评分规则。</p>
        </div>
      </header>
      <InterviewWorkspace />
    </div>
  );
}
