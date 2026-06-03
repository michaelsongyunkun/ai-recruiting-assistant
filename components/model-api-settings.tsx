"use client";

import { useEffect, useState } from "react";

type ModelConnection = {
  id: string;
  provider: string;
  baseUrl: string;
  model: string;
  workflows: string[];
  status: "verified" | "failed" | "unverified";
  keyPreview: string;
  lastTestedAt?: string | null;
  lastTestMessage?: string;
};

const workflowLabels: Record<string, string> = {
  resumeParser: "简历解析（DeepSeek）",
  productResumeScoring: "产品岗简历评分",
  screening: "初筛",
  interviewGuide: "面试题生成",
  interviewSummary: "面试评分"
};

const workflowOptions = Object.keys(workflowLabels);
const providerOptions = [
  {
    value: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat"
  },
  {
    value: "openai-compatible",
    label: "OpenAI 兼容接口",
    baseUrl: "https://api.example.com/v1",
    model: ""
  }
];

export function ModelApiSettings() {
  const [connections, setConnections] = useState<ModelConnection[]>([]);
  const [status, setStatus] = useState("正在读取本地 API 连接...");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "",
    workflows: workflowOptions
  });

  async function refresh(message?: string) {
    const response = await fetch("/api/settings/model-connections");
    const payload = await response.json();
    setConnections(payload.connections || []);
    setStatus(message || (payload.connections?.length ? "已读取本地连接。" : "尚未配置可用 API。"));
  }

  useEffect(() => {
    refresh().catch(() => setStatus("读取连接失败，请确认本地服务正在运行。"));
  }, []);

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateProvider(value: string) {
    const provider = providerOptions.find((option) => option.value === value);
    setForm((current) => ({
      ...current,
      provider: value,
      baseUrl: provider?.baseUrl || current.baseUrl,
      model: provider?.model || current.model
    }));
  }

  function toggleWorkflow(workflow: string) {
    setForm((current) => {
      const workflows = current.workflows.includes(workflow)
        ? current.workflows.filter((item) => item !== workflow)
        : [...current.workflows, workflow];
      return { ...current, workflows };
    });
  }

  async function submit(action: "save" | "saveAndTest") {
    setIsSaving(true);
    setStatus(action === "saveAndTest" ? "正在保存并测试连接..." : "正在保存连接...");
    try {
      const response = await fetch("/api/settings/model-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setStatus(payload.test?.message || payload.message || "连接保存失败。");
        await refresh();
        return;
      }
      setForm((current) => ({ ...current, apiKey: "" }));
      await refresh(payload.test?.message || "连接已保存。");
    } catch {
      setStatus("连接请求失败，请检查本地服务。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteModelConnection(connection: ModelConnection) {
    const confirmed = window.confirm(`确认删除模型 API 连接「${connection.model || connection.provider}」？删除后相关 AI 流程会被阻断，直到重新配置并验证 API。`);
    if (!confirmed) return;

    setStatus("正在删除模型 API 连接...");
    try {
      const response = await fetch("/api/settings/model-connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setStatus(payload.message || "删除模型 API 连接失败。");
        return;
      }
      await refresh("模型 API 连接已删除。");
    } catch {
      setStatus("删除请求失败，请检查本地服务。");
    }
  }

  const verifiedConnection = connections.find((connection) => connection.status === "verified");

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">企业自有模型 API</p>
            <h2>API 连接</h2>
          </div>
          <span className={`statusPill ${verifiedConnection ? "success" : "blocked"}`}>
            {verifiedConnection ? "已验证" : "未验证"}
          </span>
        </div>
        <div className="formStack">
          <div className="settingsGrid">
            <label>
              服务商
              <select value={form.provider} onChange={(event) => updateProvider(event.target.value)}>
                {providerOptions.map((provider) => (
                  <option value={provider.value} key={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              接口地址
              <input
                value={form.baseUrl}
                onChange={(event) => updateField("baseUrl", event.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </label>
            <label>
              模型
              <input
                value={form.model}
                onChange={(event) => updateField("model", event.target.value)}
                placeholder="供应商后台显示的模型 ID"
              />
            </label>
            <label>
              API Key
              <input
                value={form.apiKey}
                onChange={(event) => updateField("apiKey", event.target.value)}
                placeholder="保存后不可回显，只显示脱敏片段"
                type="password"
              />
            </label>
          </div>

          <div className="checkboxGrid">
            {workflowOptions.map((workflow) => (
              <label key={workflow}>
                <input
                  checked={form.workflows.includes(workflow)}
                  onChange={() => toggleWorkflow(workflow)}
                  type="checkbox"
                />
                {workflowLabels[workflow]}
              </label>
            ))}
          </div>

          <div className="buttonRow">
            <button disabled={isSaving} onClick={() => submit("saveAndTest")} type="button">
              保存并测试连接
            </button>
            <button className="secondaryButton" disabled={isSaving} onClick={() => submit("save")} type="button">
              仅保存
            </button>
          </div>
        </div>
        <p className="helperText">{status}</p>
      </section>

      <section className="panel">
        <p className="eyebrow">已保存连接</p>
        <h2>本地凭据状态</h2>
        <div className="connectionList">
          {connections.length === 0 ? (
            <p className="helperText">暂无连接。初筛和面试 AI 会保持阻断。</p>
          ) : (
            connections.map((connection) => (
              <article key={connection.id}>
                <div>
                  <strong>{connection.model || "未命名模型"}</strong>
                  <p>
                    {connection.provider} / {connection.baseUrl}
                  </p>
                  <p>API Key：{connection.keyPreview}</p>
                </div>
                <div className="connectionMeta">
                  <span
                    className={`statusPill ${
                      connection.status === "verified"
                        ? "success"
                        : connection.status === "failed"
                          ? "blocked"
                          : "watch"
                    }`}
                  >
                    {connection.status === "verified"
                      ? "已验证"
                      : connection.status === "failed"
                        ? "验证失败"
                        : "未验证"}
                  </span>
                  <div className="workflowRow">
                    {connection.workflows.map((workflow) => (
                      <span className="workflowChip" key={workflow}>
                        {workflowLabels[workflow] || workflow}
                      </span>
                    ))}
                  </div>
                  <button className="dangerButton" type="button" onClick={() => deleteModelConnection(connection)}>
                    删除连接
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">安全边界</p>
        <h2>不使用平台默认模型兜底</h2>
        <p>简历解析、产品岗简历评分、初筛、面试题生成、面试评分都会被阻断，直到企业连接并验证自己的 API Key 或私有模型端点。</p>
        <code className="inlineCode">ALLOW_PLATFORM_AI_FALLBACK=false</code>
      </section>
    </div>
  );
}
