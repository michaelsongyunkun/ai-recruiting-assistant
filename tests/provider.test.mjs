import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateJson } from "../lib/ai/provider.js";

const providerSource = await readFile("lib/ai/provider.js", "utf8");

const missingConnection = await generateJson({
  organizationId: "org_without_connection",
  workflow: "screening",
  system: "Return JSON.",
  user: "{}",
  schemaName: "screeningRecommendation"
});

assert.equal(missingConnection.ok, false);
assert.equal(missingConnection.code, "USER_API_CONNECTION_REQUIRED");
assert.match(missingConnection.message, /企业自己的模型 API/);

const mockResponseWithoutApi = await generateJson({
  organizationId: "org_demo",
  workflow: "screening",
  system: "Return JSON.",
  user: "{}",
  schemaName: "screeningRecommendation",
  connections: [
    {
      id: "model_without_key",
      organizationId: "org_demo",
      provider: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      model: "recruiting-json-model",
      workflows: ["screening"],
      status: "verified",
      credentialId: "cred_without_key"
    }
  ],
  mockResponse: {
    overallRecommendation: "review",
    overallScore: 3,
    summary: "This must not bypass the missing API key.",
    criteria: [],
    reviewerChecklist: []
  }
});

assert.equal(mockResponseWithoutApi.ok, false);
assert.equal(mockResponseWithoutApi.code, "MODEL_PROVIDER_CALL_FAILED");
assert.match(mockResponseWithoutApi.error, /API_KEY_REQUIRED/);

const mockBaseUrlBlocked = await generateJson({
  organizationId: "org_demo",
  workflow: "screening",
  system: "Return JSON.",
  user: "{}",
  schemaName: "screeningRecommendation",
  connections: [
    {
      id: "model_mock",
      organizationId: "org_demo",
      provider: "mock-compatible",
      baseUrl: "mock://local",
      model: "mock-screening",
      workflows: ["screening"],
      status: "verified",
      credentialId: "cred_mock",
      apiKey: "sk-user-owned-secret"
    }
  ]
});

assert.equal(mockBaseUrlBlocked.ok, false);
assert.equal(mockBaseUrlBlocked.code, "MODEL_PROVIDER_CALL_FAILED");
assert.match(mockBaseUrlBlocked.error, /MODEL_DEMO_PROVIDER_DISABLED/);
assert.equal(providerSource.includes("mock resume parser response"), false);

let capturedRequest = null;
const liveSuccess = await generateJson({
  organizationId: "org_demo",
  workflow: "screening",
  system: "Return screening JSON.",
  user: JSON.stringify({ candidate: { name: "Alex" } }),
  schemaName: "screeningRecommendation",
  connections: [
    {
      id: "model_live",
      organizationId: "org_demo",
      provider: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      model: "recruiting-json-model",
      workflows: ["screening"],
      status: "verified",
      credentialId: "cred_live",
      apiKey: "sk-live-secret"
    }
  ],
  fetchImpl: async (url, init) => {
    capturedRequest = { url: String(url), init };
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overallRecommendation: "review",
                overallScore: 3,
                summary: "Candidate evidence is sufficient for recruiter review.",
                criteria: [
                  {
                    criterionId: "crit_1",
                    score: 3,
                    confidence: "medium",
                    evidence: ["Resume includes product discovery work."],
                    missingInformation: [],
                    riskFlags: []
                  }
                ],
                reviewerChecklist: ["Confirm project depth in interview."]
              })
            }
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
});

assert.equal(liveSuccess.ok, true);
assert.equal(capturedRequest.url, "https://api.example.com/v1/chat/completions");
assert.equal(capturedRequest.init.headers.Authorization, "Bearer sk-live-secret");
assert.equal(JSON.parse(capturedRequest.init.body).model, "recruiting-json-model");
assert.equal(liveSuccess.modelConfig.credentialId, "cred_live");
assert.equal(liveSuccess.modelConfig.apiKey, undefined);
assert.equal(liveSuccess.parsed.summary, "Candidate evidence is sufficient for recruiter review.");

const fencedJsonWithExplanation = await generateJson({
  organizationId: "org_demo",
  workflow: "screening",
  system: "Return screening JSON.",
  user: "{}",
  schemaName: "screeningRecommendation",
  connections: [
    {
      id: "model_fenced",
      organizationId: "org_demo",
      provider: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      model: "recruiting-json-model",
      workflows: ["screening"],
      status: "verified",
      credentialId: "cred_fenced",
      apiKey: "sk-live-secret"
    }
  ],
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                'Here is the JSON result:\n```json\n{"overallRecommendation":"review","overallScore":3,"summary":"Evidence supports recruiter review.","criteria":[],"reviewerChecklist":["Confirm project details."]}\n```'
            }
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
});

assert.equal(fencedJsonWithExplanation.ok, true);
assert.equal(fencedJsonWithExplanation.parsed.summary, "Evidence supports recruiter review.");

console.log("provider.test.mjs passed");
