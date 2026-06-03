const navSections = [
  {
    title: "招聘流程",
    items: [
      { href: "/", label: "首页", index: "00" },
      { href: "/candidates", label: "简历上传/初筛", index: "01" },
      { href: "/interviews", label: "面试指南", index: "02" },
      { href: "/results", label: "综合结果", index: "03" }
    ]
  },
  {
    title: "系统配置",
    items: [
      { href: "/jobs", label: "岗位设置", index: "A1" },
      { href: "/settings/model-api", label: "模型 API", index: "A2" }
    ]
  }
];

export function AppSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brandMark">OS</span>
        <div>
          <strong>Recruiting OS</strong>
          <small>企业招聘智能体控制台</small>
        </div>
      </div>

      <nav className="navList" aria-label="主导航">
        {navSections.map((section) => (
          <div className="navSection" key={section.title}>
            <p>{section.title}</p>
            {section.items.map((item) => (
              <a className="navItem" key={item.href} href={item.href}>
                <span className="navIndex">{item.index}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebarCompliance">
        <strong>人工复核</strong>
        <span>AI 评分与建议仅作为招聘人员参考，最终决策需结合岗位优先级与人工判断。</span>
      </div>
    </aside>
  );
}
