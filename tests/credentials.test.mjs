import assert from "node:assert/strict";
import {
  decryptApiKey,
  encryptApiKey,
  redactApiKey,
  toCredentialMetadata
} from "../lib/security/credentials.js";

const encrypted = encryptApiKey("sk-user-owned-secret", "local-test-key");
assert.notEqual(encrypted, "sk-user-owned-secret");
assert.equal(decryptApiKey(encrypted, "local-test-key"), "sk-user-owned-secret");
assert.equal(redactApiKey("sk-user-owned-secret"), "sk-u...cret");
assert.equal(redactApiKey("short"), "********");

const metadata = toCredentialMetadata({
  id: "cred_1",
  provider: "openai-compatible",
  baseUrl: "https://api.example.com/v1",
  apiKey: "sk-user-owned-secret",
  createdByUserId: "user_1",
  lastTestedAt: new Date("2026-06-02T00:00:00.000Z")
});

assert.deepEqual(metadata, {
  id: "cred_1",
  provider: "openai-compatible",
  baseUrl: "https://api.example.com/v1",
  keyPreview: "sk-u...cret",
  createdByUserId: "user_1",
  lastTestedAt: new Date("2026-06-02T00:00:00.000Z")
});

console.log("credentials.test.mjs passed");
