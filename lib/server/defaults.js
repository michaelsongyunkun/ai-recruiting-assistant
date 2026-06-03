import { demoJob } from "../domain/demo-data.js";

export function defaultJobInput() {
  return {
    title: demoJob.title,
    department: demoJob.department,
    location: demoJob.location,
    jd: "负责产品发现、数据分析、跨团队协作和产品方案输出。",
    criteria: demoJob.criteria.map((criterion) => ({
      name: criterion.name,
      weight: criterion.weight,
      anchor: criterion.anchor,
      approved: true
    }))
  };
}
