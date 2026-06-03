import crypto from "node:crypto";

function deriveKey(secret) {
  return crypto.createHash("sha256").update(String(secret || "local-dev-key")).digest();
}

export function encryptApiKey(apiKey, secret = process.env.CREDENTIAL_ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptApiKey(payload, secret = process.env.CREDENTIAL_ENCRYPTION_KEY) {
  const [ivRaw, tagRaw, encryptedRaw] = String(payload).split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted credential payload");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export function redactApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 8) return "********";
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function toCredentialMetadata(credential) {
  return {
    id: credential.id,
    provider: credential.provider,
    baseUrl: credential.baseUrl,
    keyPreview: redactApiKey(credential.apiKey),
    createdByUserId: credential.createdByUserId,
    lastTestedAt: credential.lastTestedAt ?? null
  };
}

export function createStoredCredential({
  id,
  organizationId,
  provider,
  baseUrl,
  apiKey,
  createdByUserId,
  secret = process.env.CREDENTIAL_ENCRYPTION_KEY
}) {
  return {
    id,
    organizationId,
    provider,
    baseUrl,
    encryptedApiKey: encryptApiKey(apiKey, secret),
    keyPreview: redactApiKey(apiKey),
    createdByUserId,
    createdAt: new Date(),
    lastTestedAt: null,
    disabledAt: null
  };
}
