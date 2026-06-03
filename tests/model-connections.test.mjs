import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecruitingStore } from "../lib/server/recruiting-store.js";

const tempDir = await mkdtemp(join(tmpdir(), "model-connections-"));
const filePath = join(tempDir, "state.json");

try {
  const store = createRecruitingStore({ filePath });
  const rawApiKey = "sk-user-owned-secret-123456";

  await assert.rejects(
    () =>
      store.saveModelConnection({
        organizationId: "org_demo",
        provider: "mock-compatible",
        baseUrl: "mock://local",
        model: "mock-recruiting-cn",
        apiKey: rawApiKey,
        workflows: ["screening"],
        status: "verified",
        createdByUserId: "user_demo"
      }),
    /MODEL_DEMO_PROVIDER_DISABLED/
  );

  const saved = await store.saveModelConnection({
    organizationId: "org_demo",
    provider: "openai-compatible",
    baseUrl: "https://api.example.com/v1",
    model: "recruiting-model",
    apiKey: rawApiKey,
    workflows: ["resumeParser", "productResumeScoring", "screening", "interviewGuide", "interviewSummary"],
    status: "verified",
    createdByUserId: "user_demo"
  });

  assert.equal(saved.status, "verified");
  assert.equal(saved.keyPreview, "sk-u...3456");
  assert.equal(saved.apiKey, undefined);
  assert.equal(saved.encryptedApiKey, undefined);

  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.modelConnections.length, 1);
  assert.equal(snapshot.credentials.length, 1);
  assert.notEqual(snapshot.credentials[0].encryptedApiKey, rawApiKey);
  assert.equal(JSON.stringify(snapshot.modelConnections).includes(rawApiKey), false);

  const publicSnapshot = await store.getPublicSnapshot();
  assert.equal(publicSnapshot.credentials, undefined);
  assert.equal(JSON.stringify(publicSnapshot).includes(rawApiKey), false);
  assert.equal(JSON.stringify(publicSnapshot).includes("encryptedApiKey"), false);
  assert.equal(publicSnapshot.modelConnections[0].keyPreview, "sk-u...3456");

  const active = await store.getActiveModelConnection({
    organizationId: "org_demo",
    workflow: "screening"
  });

  assert.equal(active.apiKey, rawApiKey);
  assert.equal(active.credentialId, saved.credentialId);
  assert.equal(active.workflow, undefined);

  const deleted = await store.deleteModelConnection(saved.id);
  assert.equal(deleted.id, saved.id);

  const afterDelete = await store.getSnapshot();
  assert.equal(afterDelete.modelConnections.length, 0);
  assert.equal(afterDelete.credentials.length, 0);
  assert.equal(
    await store.getActiveModelConnection({
      organizationId: "org_demo",
      workflow: "screening"
    }),
    null
  );

  const deepSeekLegacy = await store.saveModelConnection({
    organizationId: "org_demo",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "sk-deepseek-secret-123456",
    workflows: ["screening"],
    status: "verified",
    createdByUserId: "user_demo"
  });

  const resumeParserConnection = await store.getActiveModelConnection({
    organizationId: "org_demo",
    workflow: "resumeParser"
  });
  const productScoringConnection = await store.getActiveModelConnection({
    organizationId: "org_demo",
    workflow: "productResumeScoring"
  });

  assert.equal(deepSeekLegacy.status, "verified");
  assert.equal(resumeParserConnection.model, "deepseek-chat");
  assert.equal(productScoringConnection.model, "deepseek-chat");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("model-connections.test.mjs passed");
