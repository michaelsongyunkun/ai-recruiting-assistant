import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recruiting OS",
  description: "面向企业招聘流程的本地 AI 简历筛选、面试指南与综合决策工作台。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="appFrame">
          <AppSidebar />
          <main className="mainContent">
            <header className="enterpriseTopbar" aria-label="工作台状态">
              <div>
                <span className="topbarLabel">Recruiting OS</span>
                <strong>企业招聘智能工作台</strong>
              </div>
              <div className="topbarMeta" aria-label="系统状态">
                <span>Local-first</span>
                <span>DeepSeek Ready</span>
                <span>HR Review</span>
              </div>
            </header>
            <div className="contentCanvas">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
