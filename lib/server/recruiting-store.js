import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createStoredCredential, decryptApiKey } from "../security/credentials.js";

const DEFAULT_STATE = {
  jobs: [],
  candidates: [],
  screeningRuns: [],
  interviewGuides: [],
  interviewNotes: [],
  interviewSummaries: [],
  interviewConfirmations: [],
  humanDecisions: [],
  auditEvents: [],
  modelConnections: [],
  credentials: []
};

const AI_WORKFLOWS = ["resumeParser", "productResumeScoring", "screening", "interviewGuide", "interviewSummary"];

function defaultFilePath() {
  if (process.env.RECRUITING_STATE_FILE) return process.env.RECRUITING_STATE_FILE;
  return join(process.cwd(), "storage", "recruiting-state.json");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function normalizeWorkflows(workflows) {
  const selected = Array.isArray(workflows) ? workflows : AI_WORKFLOWS;
  const normalized = selected.filter((workflow) => AI_WORKFLOWS.includes(workflow));
  return normalized.length > 0 ? normalized : [...AI_WORKFLOWS];
}

function isDeepSeekConnection(connection) {
  return (
    String(connection.provider || "").toLowerCase() === "deepseek" ||
    String(connection.baseUrl || "").toLowerCase().includes("deepseek")
  );
}

function isDemoModelConnection(connection) {
  const provider = String(connection.provider || "").toLowerCase();
  const baseUrl = String(connection.baseUrl || "").toLowerCase();
  return provider.includes("mock") || baseUrl.startsWith("mock://");
}

function workflowsForPublicConnection(connection) {
  const workflows = [...(connection.workflows || [])];
  if (connection.status === "verified" && isDeepSeekConnection(connection) && !workflows.includes("resumeParser")) {
    workflows.unshift("resumeParser");
  }
  if (connection.status === "verified" && isDeepSeekConnection(connection) && !workflows.includes("productResumeScoring")) {
    workflows.unshift("productResumeScoring");
  }
  return workflows;
}

function toPublicConnection(connection) {
  return {
    id: connection.id,
    organizationId: connection.organizationId,
    provider: connection.provider,
    baseUrl: connection.baseUrl,
    model: connection.model,
    workflows: workflowsForPublicConnection(connection),
    status: connection.status,
    credentialId: connection.credentialId,
    keyPreview: connection.keyPreview,
    createdByUserId: connection.createdByUserId,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    lastTestedAt: connection.lastTestedAt || null,
    lastTestMessage: connection.lastTestMessage || ""
  };
}

function toPublicSnapshot(state) {
  const { credentials, ...rest } = state;
  return {
    ...clone(rest),
    modelConnections: (state.modelConnections || []).map(toPublicConnection)
  };
}

function normalizeCriterion(criterion, index) {
  return {
    id: criterion.id || `crit_${index + 1}_${Math.random().toString(16).slice(2, 6)}`,
    name: criterion.name,
    weight: Number(criterion.weight || 0),
    anchor: criterion.anchor || "",
    approved: criterion.approved !== false
  };
}

async function readState(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeState({ ...clone(DEFAULT_STATE), ...parsed });
    if (normalized.migrated) {
      await writeState(filePath, normalized.state);
    }
    return normalized.state;
  } catch (error) {
    if (error.code === "ENOENT") return clone(DEFAULT_STATE);
    throw error;
  }
}

async function writeState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function addAudit(state, event) {
  state.auditEvents.push({
    id: makeId("audit"),
    createdAt: now(),
    actor: event.actor || "system",
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata: event.metadata || {}
  });
}

function removeApplicationRecords(state, predicate) {
  const screeningRunIds = new Set(
    state.screeningRuns.filter(predicate.screeningRun).map((item) => item.id)
  );
  const interviewGuideIds = new Set(
    state.interviewGuides.filter(predicate.interviewGuide).map((item) => item.id)
  );
  const interviewSummaryIds = new Set(
    state.interviewSummaries
      .filter((item) => interviewGuideIds.has(item.interviewGuideId) || predicate.interviewSummary(item))
      .map((item) => item.id)
  );

  const removed = {
    screeningRuns: screeningRunIds.size,
    humanDecisions: state.humanDecisions.filter(
      (item) => screeningRunIds.has(item.screeningRunId) || predicate.humanDecision(item)
    ).length,
    interviewGuides: interviewGuideIds.size,
    interviewNotes: state.interviewNotes.filter(
      (item) => interviewGuideIds.has(item.interviewGuideId) || predicate.interviewNote(item)
    ).length,
    interviewSummaries: interviewSummaryIds.size,
    interviewConfirmations: state.interviewConfirmations.filter(
      (item) => interviewSummaryIds.has(item.interviewSummaryId) || predicate.interviewConfirmation(item)
    ).length
  };

  state.screeningRuns = state.screeningRuns.filter((item) => !screeningRunIds.has(item.id));
  state.humanDecisions = state.humanDecisions.filter(
    (item) => !screeningRunIds.has(item.screeningRunId) && !predicate.humanDecision(item)
  );
  state.interviewGuides = state.interviewGuides.filter((item) => !interviewGuideIds.has(item.id));
  state.interviewNotes = state.interviewNotes.filter(
    (item) => !interviewGuideIds.has(item.interviewGuideId) && !predicate.interviewNote(item)
  );
  state.interviewSummaries = state.interviewSummaries.filter((item) => !interviewSummaryIds.has(item.id));
  state.interviewConfirmations = state.interviewConfirmations.filter(
    (item) => !interviewSummaryIds.has(item.interviewSummaryId) && !predicate.interviewConfirmation(item)
  );

  return removed;
}

function normalizeCandidateResume(candidate) {
  if (!candidate?.resume) return false;

  let migrated = false;
  if (candidate.resume.parsedProfile === undefined && candidate.profile !== undefined) {
    candidate.resume.parsedProfile = candidate.profile || null;
    migrated = true;
  }

  if (candidate.resume.productResumeScore === undefined && candidate.productResumeScore !== undefined) {
    candidate.resume.productResumeScore = candidate.productResumeScore || null;
    migrated = true;
  }

  return migrated;
}

function normalizeState(state) {
  let migrated = false;
  for (const candidate of state.candidates || []) {
    migrated = normalizeCandidateResume(candidate) || migrated;
  }
  return { state, migrated };
}

export function createRecruitingStore({ filePath = defaultFilePath() } = {}) {
  async function mutate(mutator) {
    const state = await readState(filePath);
    const result = await mutator(state);
    await writeState(filePath, state);
    return result;
  }

  return {
    async getSnapshot() {
      return readState(filePath);
    },

    async getPublicSnapshot() {
      const state = await readState(filePath);
      return toPublicSnapshot(state);
    },

    async getPublicModelConnections() {
      const state = await readState(filePath);
      return (state.modelConnections || []).map(toPublicConnection);
    },

    async getActiveModelConnection({ organizationId = "org_demo", workflow }) {
      const state = await readState(filePath);
      const connection = (state.modelConnections || []).find(
        (item) =>
          item.organizationId === organizationId &&
          !isDemoModelConnection(item) &&
          item.status === "verified" &&
          Array.isArray(item.workflows) &&
          (item.workflows.includes(workflow) ||
            (["resumeParser", "productResumeScoring"].includes(workflow) && isDeepSeekConnection(item)))
      );
      if (!connection) return null;

      const credential = (state.credentials || []).find(
        (item) => item.id === connection.credentialId && !item.disabledAt
      );
      if (!credential) return null;

      return {
        ...toPublicConnection(connection),
        apiKey: decryptApiKey(credential.encryptedApiKey)
      };
    },

    async saveModelConnection(input) {
      return mutate(async (state) => {
        if (!input.apiKey) throw new Error("API_KEY_REQUIRED");
        if (isDemoModelConnection(input)) throw new Error("MODEL_DEMO_PROVIDER_DISABLED");

        const connectionId = input.connectionId || input.id || makeId("model");
        const credentialId = input.credentialId || makeId("cred");
        const credential = createStoredCredential({
          id: credentialId,
          organizationId: input.organizationId || "org_demo",
          provider: input.provider || "openai-compatible",
          baseUrl: input.baseUrl || "",
          apiKey: input.apiKey,
          createdByUserId: input.createdByUserId || "user_demo"
        });
        credential.lastTestedAt = input.lastTestedAt || null;

        state.credentials = (state.credentials || []).filter((item) => item.id !== credential.id);
        state.credentials.unshift(credential);

        const existing = (state.modelConnections || []).find((item) => item.id === connectionId);
        const connection = {
          id: connectionId,
          organizationId: credential.organizationId,
          provider: credential.provider,
          baseUrl: credential.baseUrl,
          model: input.model || existing?.model || "",
          workflows: normalizeWorkflows(input.workflows),
          status: input.status || "unverified",
          credentialId: credential.id,
          keyPreview: credential.keyPreview,
          createdByUserId: credential.createdByUserId,
          createdAt: existing?.createdAt || now(),
          updatedAt: now(),
          lastTestedAt: input.lastTestedAt || null,
          lastTestMessage: input.lastTestMessage || ""
        };

        state.modelConnections = (state.modelConnections || []).filter((item) => item.id !== connection.id);
        state.modelConnections.unshift(connection);
        addAudit(state, {
          action: "保存模型 API 连接",
          entityType: "modelConnection",
          entityId: connection.id,
          actor: input.createdByUserId || "user_demo",
          metadata: {
            provider: connection.provider,
            baseUrl: connection.baseUrl,
            model: connection.model,
            workflows: connection.workflows,
            status: connection.status
          }
        });

        return toPublicConnection(connection);
      });
    },

    async deleteModelConnection(connectionId) {
      return mutate(async (state) => {
        const connection = (state.modelConnections || []).find((item) => item.id === connectionId);
        if (!connection) throw new Error("MODEL_CONNECTION_NOT_FOUND");

        state.modelConnections = (state.modelConnections || []).filter((item) => item.id !== connection.id);
        state.credentials = (state.credentials || []).filter((item) => item.id !== connection.credentialId);
        addAudit(state, {
          action: "删除模型 API 连接",
          entityType: "modelConnection",
          entityId: connection.id,
          actor: connection.createdByUserId || "user_demo",
          metadata: {
            provider: connection.provider,
            baseUrl: connection.baseUrl,
            model: connection.model,
            workflows: connection.workflows
          }
        });

        return toPublicConnection(connection);
      });
    },

    async createJob(input) {
      return mutate(async (state) => {
        const criteria = (input.criteria || []).map(normalizeCriterion);
        const job = {
          id: makeId("job"),
          title: input.title,
          department: input.department || "",
          location: input.location || "",
          jd: input.jd || "",
          criteria,
          rubricApproved: criteria.length > 0 && criteria.every((criterion) => criterion.approved),
          createdAt: now(),
          updatedAt: now()
        };
        state.jobs.unshift(job);
        addAudit(state, {
          action: "创建岗位",
          entityType: "job",
          entityId: job.id,
          metadata: { title: job.title, criteriaCount: criteria.length }
        });
        return job;
      });
    },

    async deleteJob(jobId) {
      return mutate(async (state) => {
        const job = state.jobs.find((item) => item.id === jobId);
        if (!job) throw new Error("JOB_NOT_FOUND");

        state.jobs = state.jobs.filter((item) => item.id !== jobId);
        const removed = removeApplicationRecords(state, {
          screeningRun: (item) => item.jobId === jobId,
          humanDecision: (item) => item.jobId === jobId,
          interviewGuide: (item) => item.jobId === jobId,
          interviewNote: (item) => item.jobId === jobId,
          interviewSummary: (item) => item.jobId === jobId,
          interviewConfirmation: (item) => item.jobId === jobId
        });
        addAudit(state, {
          action: "删除岗位",
          entityType: "job",
          entityId: job.id,
          metadata: { title: job.title, removed }
        });

        return job;
      });
    },

    async createCandidateFromResume(input) {
      return mutate(async (state) => {
        const candidate = {
          id: makeId("cand"),
          name: input.profile?.name || "未识别姓名",
          email: input.profile?.email || "",
          stage: "待初筛",
          hasResume: true,
          resume: {
            fileName: input.fileName,
            textLength: input.resumeText?.length || 0,
            uploadedAt: now(),
            parserModelConfig: input.modelConfig || null,
            parsedProfile: input.profile || null,
            parsingWorkflow: input.parsingWorkflow || null,
            textExtraction: input.textExtraction || null,
            productResumeScore: input.productResumeScore || null
          },
          profile: input.profile,
          createdAt: now(),
          updatedAt: now()
        };
        state.candidates.unshift(candidate);
        addAudit(state, {
          action: "上传候选人简历",
          entityType: "candidate",
          entityId: candidate.id,
          metadata: { fileName: input.fileName, email: candidate.email }
        });
        return candidate;
      });
    },

    async deleteCandidate(candidateId) {
      return mutate(async (state) => {
        const candidate = state.candidates.find((item) => item.id === candidateId);
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        state.candidates = state.candidates.filter((item) => item.id !== candidateId);
        const removed = removeApplicationRecords(state, {
          screeningRun: (item) => item.candidateId === candidateId,
          humanDecision: (item) => item.candidateId === candidateId,
          interviewGuide: (item) => item.candidateId === candidateId,
          interviewNote: (item) => item.candidateId === candidateId,
          interviewSummary: (item) => item.candidateId === candidateId,
          interviewConfirmation: (item) => item.candidateId === candidateId
        });
        addAudit(state, {
          action: "删除候选人",
          entityType: "candidate",
          entityId: candidate.id,
          metadata: { name: candidate.name, email: candidate.email, removed }
        });

        return candidate;
      });
    },

    async saveScreeningRun(input) {
      return mutate(async (state) => {
        const job = state.jobs.find((item) => item.id === input.jobId);
        const candidate = state.candidates.find((item) => item.id === input.candidateId);
        if (!job) throw new Error("JOB_NOT_FOUND");
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        const run = {
          id: makeId("screen"),
          jobId: job.id,
          candidateId: candidate.id,
          status: "待人工确认",
          result: input.result,
          modelConfig: input.modelConfig || null,
          createdAt: now()
        };
        state.screeningRuns.unshift(run);
        candidate.stage = "待人工确认";
        candidate.updatedAt = now();
        addAudit(state, {
          action: "运行 AI 初筛",
          entityType: "screeningRun",
          entityId: run.id,
          metadata: {
            jobId: job.id,
            candidateId: candidate.id,
            recommendation: input.result?.overallRecommendation
          }
        });
        return run;
      });
    },

    async recordHumanDecision(input) {
      return mutate(async (state) => {
        const run = state.screeningRuns.find((item) => item.id === input.screeningRunId);
        if (!run) throw new Error("SCREENING_RUN_NOT_FOUND");
        const candidate = state.candidates.find((item) => item.id === run.candidateId);
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        const decision = {
          id: makeId("decision"),
          screeningRunId: run.id,
          candidateId: candidate.id,
          jobId: run.jobId,
          decision: input.decision,
          stage: input.decision,
          reviewerName: input.reviewerName,
          note: input.note || "",
          createdAt: now()
        };
        state.humanDecisions.unshift(decision);
        run.status = "已人工确认";
        candidate.stage = decision.stage;
        candidate.updatedAt = now();
        addAudit(state, {
          action: "人工确认初筛结果",
          entityType: "humanDecision",
          entityId: decision.id,
          actor: input.reviewerName,
          metadata: { decision: input.decision, note: input.note || "" }
        });
        return decision;
      });
    },

    async saveInterviewGuide(input) {
      return mutate(async (state) => {
        const job = state.jobs.find((item) => item.id === input.jobId);
        const candidate = state.candidates.find((item) => item.id === input.candidateId);
        if (!job) throw new Error("JOB_NOT_FOUND");
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        const guide = {
          id: makeId("interview"),
          jobId: job.id,
          candidateId: candidate.id,
          screeningRunId: input.screeningRunId || null,
          status: "待记录面试",
          result: input.result,
          modelConfig: input.modelConfig || null,
          createdAt: now(),
          updatedAt: now()
        };
        state.interviewGuides.unshift(guide);
        candidate.stage = "待记录面试";
        candidate.updatedAt = now();
        addAudit(state, {
          action: "生成面试指南",
          entityType: "interviewGuide",
          entityId: guide.id,
          metadata: {
            jobId: job.id,
            candidateId: candidate.id,
            screeningRunId: guide.screeningRunId
          }
        });
        return guide;
      });
    },

    async addInterviewNote(input) {
      return mutate(async (state) => {
        const guide = state.interviewGuides.find((item) => item.id === input.interviewGuideId);
        if (!guide) throw new Error("INTERVIEW_GUIDE_NOT_FOUND");

        const note = {
          id: makeId("note"),
          interviewGuideId: guide.id,
          jobId: guide.jobId,
          candidateId: guide.candidateId,
          authorName: input.authorName || "面试官",
          content: input.content || "",
          createdAt: now()
        };
        state.interviewNotes.unshift(note);
        guide.status = "面试记录中";
        guide.updatedAt = now();
        addAudit(state, {
          action: "记录面试笔记",
          entityType: "interviewNote",
          entityId: note.id,
          actor: note.authorName,
          metadata: { interviewGuideId: guide.id }
        });
        return note;
      });
    },

    async saveInterviewSummary(input) {
      return mutate(async (state) => {
        const guide = state.interviewGuides.find((item) => item.id === input.interviewGuideId);
        if (!guide) throw new Error("INTERVIEW_GUIDE_NOT_FOUND");
        const candidate = state.candidates.find((item) => item.id === guide.candidateId);
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        const summary = {
          id: makeId("summary"),
          interviewGuideId: guide.id,
          jobId: guide.jobId,
          candidateId: guide.candidateId,
          status: "待人工确认",
          result: input.result,
          modelConfig: input.modelConfig || null,
          createdAt: now(),
          updatedAt: now()
        };
        state.interviewSummaries.unshift(summary);
        guide.status = "待确认总结";
        guide.updatedAt = now();
        candidate.stage = "面试总结待确认";
        candidate.updatedAt = now();
        addAudit(state, {
          action: "生成面试总结",
          entityType: "interviewSummary",
          entityId: summary.id,
          metadata: {
            interviewGuideId: guide.id,
            citedNoteIds: input.result?.citedNoteIds || []
          }
        });
        return summary;
      });
    },

    async confirmInterviewSummary(input) {
      return mutate(async (state) => {
        const summary = state.interviewSummaries.find((item) => item.id === input.interviewSummaryId);
        if (!summary) throw new Error("INTERVIEW_SUMMARY_NOT_FOUND");
        const guide = state.interviewGuides.find((item) => item.id === summary.interviewGuideId);
        const candidate = state.candidates.find((item) => item.id === summary.candidateId);
        if (!guide) throw new Error("INTERVIEW_GUIDE_NOT_FOUND");
        if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

        const confirmation = {
          id: makeId("interview_confirm"),
          interviewSummaryId: summary.id,
          interviewGuideId: guide.id,
          candidateId: summary.candidateId,
          jobId: summary.jobId,
          status: "已人工确认",
          decision: input.decision || "面试总结已确认",
          reviewerName: input.reviewerName || "HR",
          note: input.note || "",
          createdAt: now()
        };
        state.interviewConfirmations.unshift(confirmation);
        summary.status = confirmation.status;
        summary.confirmationId = confirmation.id;
        summary.updatedAt = now();
        guide.status = "总结已确认";
        guide.updatedAt = now();
        candidate.stage = confirmation.decision;
        candidate.updatedAt = now();
        addAudit(state, {
          action: "人工确认面试总结",
          entityType: "interviewConfirmation",
          entityId: confirmation.id,
          actor: confirmation.reviewerName,
          metadata: {
            decision: confirmation.decision,
            note: confirmation.note
          }
        });
        return confirmation;
      });
    }
  };
}
