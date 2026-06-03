export const demoJob = {
  id: "job_pm_1",
  title: "高级产品经理",
  department: "产品部",
  location: "远程 / 中国与美国团队协作",
  rubricApproved: true,
  criteria: [
    {
      id: "crit_discovery",
      name: "产品发现",
      weight: 35,
      approved: true,
      anchor: "能发现客户问题、验证假设，并把需求收敛为可执行 MVP。"
    },
    {
      id: "crit_stakeholders",
      name: "干系人协同",
      weight: 25,
      approved: true,
      anchor: "能协调研发、销售、客服和管理层，推动关键取舍。"
    },
    {
      id: "crit_analytics",
      name: "数据分析",
      weight: 25,
      approved: true,
      anchor: "能用产品指标、漏斗和实验结果支持决策。"
    },
    {
      id: "crit_writing",
      name: "书面表达",
      weight: 15,
      approved: true,
      anchor: "能写清楚产品方案、上线说明和决策记录。"
    }
  ]
};

export const demoCandidate = {
  id: "cand_alex",
  name: "陈安",
  email: "alex.chen@example.com",
  stage: "待初筛",
  source: "简历上传",
  profileSummary:
    "有平台产品经验，熟悉产品发现、数据分析和跨团队协作。"
};

export const demoScreeningRecommendation = {
  overallRecommendation: "review",
  overallScore: 3.25,
  summary: "候选人在产品发现和数据分析上有较强证据，干系人协同需要面试进一步验证。",
  criteria: [
    {
      criterionId: "crit_discovery",
      score: 4,
      confidence: "high",
      evidence: ["主导过企业工作流客户的产品发现。"],
      missingInformation: [],
      riskFlags: []
    },
    {
      criterionId: "crit_stakeholders",
      score: 3,
      confidence: "medium",
      evidence: ["与研发和客服一起推进路线图决策。"],
      missingInformation: ["简历中没有明确的高层协同案例。"],
      riskFlags: []
    },
    {
      criterionId: "crit_analytics",
      score: 3,
      confidence: "medium",
      evidence: ["定义过激活指标和漏斗看板。"],
      missingInformation: [],
      riskFlags: []
    },
    {
      criterionId: "crit_writing",
      score: 3,
      confidence: "medium",
      evidence: ["为内部团队写过上线说明。"],
      missingInformation: ["未提供公开写作样例。"],
      riskFlags: []
    }
  ],
  reviewerChecklist: [
    "确认高层干系人协同案例。",
    "追问一次具体实验设计。",
    "最终推荐前查看一份写作样例。"
  ]
};

export const demoInterviewGuide = {
  interviewType: "hiring_manager",
  openingScript: "感谢参加面试。今天会重点了解你的产品发现、数据分析和协作证据。",
  questions: [
    {
      criterionId: "crit_discovery",
      question: "请讲一个最初方案后来被证据推翻的产品发现项目。",
      followUps: ["是什么证据让你改变判断？", "你如何向团队沟通方向调整？"],
      strongSignal: "能使用客户证据，并清楚解释取舍。",
      weakSignal: "只描述主观看法，缺少验证过程。"
    },
    {
      criterionId: "crit_analytics",
      question: "请描述一个你设计的指标如何改变了路线图决策。",
      followUps: ["当时的基线是多少？", "团队最终采取了什么行动？"],
      strongSignal: "能把指标设计和产品决策联系起来。",
      weakSignal: "只列举看板，没有说明决策影响。"
    },
    {
      criterionId: "crit_stakeholders",
      question: "请讲一次销售和研发对功能优先级意见不一致的经历。",
      followUps: ["你们最后如何决策？", "谁对结果不满意？你怎么处理？"],
      strongSignal: "展示结构化对齐和明确取舍。",
      weakSignal: "回避冲突，或只依赖上级拍板。"
    }
  ],
  candidateSpecificClarifications: ["确认高层协同案例。", "请候选人提供一份产品方案或上线说明。"]
};

export const demoFairnessRows = [
  { group: "自愿披露群组 A", total: 100, selected: 40 },
  { group: "自愿披露群组 B", total: 80, selected: 20 },
  { group: "自愿披露群组 C", total: 12, selected: 5 }
];
