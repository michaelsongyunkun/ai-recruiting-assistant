import { InterviewResultsWorkspace } from "../../components/interview-results-workspace";

export default function ResultsPage() {
  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">模块 ④ 面试结果</p>
          <h1>综合简历得分和面试得分</h1>
          <p>选择候选人后，系统会自动接入简历评分和面试评分，并按 HR 设置的占比给出最终判断。</p>
        </div>
      </header>
      <InterviewResultsWorkspace />
    </div>
  );
}
