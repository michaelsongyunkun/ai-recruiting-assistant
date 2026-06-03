const skillKeywords = [
  "TypeScript",
  "JavaScript",
  "React",
  "PostgreSQL",
  "API design",
  "Node.js",
  "Python",
  "Product discovery",
  "Analytics",
  "Stakeholder management",
  "产品发现",
  "数据分析",
  "干系人协同",
  "书面表达"
];

export function parseResumeText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phoneCandidate = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? null;
  const digits = phoneCandidate ? phoneCandidate.replace(/\D/g, "") : "";
  const phone =
    phoneCandidate && digits.length >= 8 && !/^\d{4}-\d{4}$/.test(phoneCandidate.trim())
      ? phoneCandidate
      : null;
  const name = lines.find((line) => !line.includes("@") && !line.includes(",")) ?? null;

  const workHistory = [];
  for (const line of lines) {
    const match = line.match(/^(.+?),\s*(.+?),\s*(\d{4})-(\d{4}|Present)$/i);
    if (match) {
      workHistory.push({
        title: match[1],
        company: match[2],
        startDate: match[3],
        endDate: match[4],
        evidence: line
      });
    }
  }

  const skills = skillKeywords
    .filter((skill) => text.toLowerCase().includes(skill.toLowerCase()))
    .map((skill) => ({ name: skill, evidence: findEvidenceLine(lines, skill) }));

  const education = lines
    .filter((line) => /\b(B\.S\.|M\.S\.|MBA|Ph\.D\.|Bachelor|Master|University|College)\b/i.test(line))
    .map((line) => ({ institution: line, credential: line, evidence: line }));

  return {
    name,
    email,
    phone,
    location: null,
    workHistory,
    skills,
    education,
    certifications: [],
    unsupportedClaims: [],
    protectedTraitsInferred: false
  };
}

function findEvidenceLine(lines, needle) {
  return lines.find((line) => line.toLowerCase().includes(needle.toLowerCase())) ?? needle;
}
