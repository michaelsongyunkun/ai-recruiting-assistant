import assert from "node:assert/strict";
import { extractResumeTextFromBuffer } from "../lib/documents/resume-text-extractor.js";

const textResult = await extractResumeTextFromBuffer({
  fileName: "resume.txt",
  mimeType: "text/plain",
  buffer: Buffer.from("Alex Chen\nalex.chen@example.com\nProduct discovery and data analysis", "utf8")
});

assert.equal(textResult.ok, true);
assert.equal(textResult.text.includes("Alex Chen"), true);
assert.equal(textResult.textExtraction.kind, "text");

const legacyDocResult = await extractResumeTextFromBuffer({
  fileName: "resume.doc",
  mimeType: "application/msword",
  buffer: Buffer.from("D0CF11E0", "hex")
});

assert.equal(legacyDocResult.ok, false);
assert.equal(legacyDocResult.code, "LEGACY_DOC_UNSUPPORTED");

const fakePdfResult = await extractResumeTextFromBuffer({
  fileName: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<</Type/Catalog>>\nendobj", "utf8")
});

assert.equal(fakePdfResult.ok, false);
assert.notEqual(fakePdfResult.text, "%PDF-1.7\n1 0 obj\n<</Type/Catalog>>\nendobj");

console.log("resume-text-extractor.test.mjs passed");
