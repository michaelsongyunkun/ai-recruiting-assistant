import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { homedir, tmpdir } from "node:os";

const MAX_MODEL_TEXT_CHARS = 60000;
const EXTRACTION_TIMEOUT_MS = 25000;

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function safeFileName(fileName) {
  return String(fileName || "resume")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
}

function detectKind({ fileName = "", mimeType = "", buffer }) {
  const lowerName = String(fileName || "").toLowerCase();
  const lowerMime = String(mimeType || "").toLowerCase();
  const header = buffer.subarray(0, 8).toString("latin1");

  if (header.startsWith("%PDF") || lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (header.startsWith("PK\u0003\u0004") || lowerName.endsWith(".docx")) return "docx";
  if (lowerName.endsWith(".doc")) return "doc";
  if (lowerMime.startsWith("text/") || [".txt", ".md", ".csv"].includes(extname(lowerName))) return "text";
  return "text";
}

function pythonCandidates() {
  const configured = [process.env.RESUME_EXTRACT_PYTHON, process.env.PYTHON].filter(Boolean);
  const bundled = join(
    homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    process.platform === "win32" ? "python.exe" : "bin/python"
  );
  const candidates = configured.map((command) => ({ command, argsPrefix: [] }));
  if (existsSync(bundled)) candidates.push({ command: bundled, argsPrefix: [] });
  candidates.push({ command: "python", argsPrefix: [] });
  candidates.push({ command: "python3", argsPrefix: [] });
  if (process.platform === "win32") candidates.push({ command: "py", argsPrefix: ["-3"] });
  return candidates;
}

function runProcess(command, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1"
        },
        windowsHide: true
      });
    } catch (error) {
      resolve({ ok: false, code: "DOCUMENT_TEXT_EXTRACTOR_UNAVAILABLE", error: error.message });
      return;
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({
        ok: false,
        code: "DOCUMENT_TEXT_EXTRACTION_TIMEOUT",
        error: `Text extraction timed out after ${EXTRACTION_TIMEOUT_MS}ms`
      });
    }, EXTRACTION_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, code: "DOCUMENT_TEXT_EXTRACTOR_UNAVAILABLE", error: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ ok: true, stdout, stderr });
      } else {
        resolve({
          ok: false,
          code: "DOCUMENT_TEXT_EXTRACTION_FAILED",
          error: stderr || stdout || `extractor exited with code ${code}`
        });
      }
    });
  });
}

async function runPythonExtractor({ buffer, kind, fileName }) {
  const tempDir = join(tmpdir(), "ai-recruiting-assistant");
  await mkdir(tempDir, { recursive: true });
  const inputPath = join(tempDir, `${randomUUID()}-${safeFileName(fileName)}`);
  const scriptPath = join(process.cwd(), "scripts", "extract-document-text.py");
  await writeFile(inputPath, buffer);

  let lastError = null;
  try {
    for (const candidate of pythonCandidates()) {
      const result = await runProcess(candidate.command, [
        ...candidate.argsPrefix,
        scriptPath,
        inputPath,
        kind
      ]);

      if (!result.ok) {
        lastError = result;
        if (result.code === "DOCUMENT_TEXT_EXTRACTOR_UNAVAILABLE") continue;
        continue;
      }

      try {
        const payload = JSON.parse(result.stdout);
        if (!payload.ok) {
          lastError = {
            code: "DOCUMENT_TEXT_EXTRACTION_FAILED",
            error: payload.error || "document extractor failed"
          };
          continue;
        }

        return {
          ok: true,
          text: normalizeText(payload.text).slice(0, MAX_MODEL_TEXT_CHARS),
          metadata: payload.metadata || {},
          extractor: "python"
        };
      } catch (error) {
        lastError = {
          code: "DOCUMENT_TEXT_EXTRACTION_FAILED",
          error: `Extractor returned invalid JSON: ${error.message}`
        };
      }
    }
  } finally {
    await unlink(inputPath).catch(() => {});
  }

  return {
    ok: false,
    code: lastError?.code || "DOCUMENT_TEXT_EXTRACTOR_UNAVAILABLE",
    message:
      kind === "pdf"
        ? "PDF 文本提取失败。请确认文件不是加密 PDF；如果是扫描件，需要先做 OCR 或换成可复制文本的 PDF。"
        : "Word 文档文本提取失败。请换成 .docx、.pdf 或 .txt 后重试。",
    error: lastError?.error || ""
  };
}

function extractionSummary({ kind, text, metadata }) {
  const length = normalizeText(text).length;
  if (kind === "pdf") {
    return `PDF 文本层提取成功，提取约 ${length} 个字符，页数 ${metadata?.pageCount || "未知"}。`;
  }
  if (kind === "docx") {
    return `DOCX 文本提取成功，提取约 ${length} 个字符。`;
  }
  return `纯文本读取成功，提取约 ${length} 个字符。`;
}

export async function extractResumeTextFromBuffer({ buffer, fileName = "", mimeType = "" }) {
  const documentBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const kind = detectKind({ fileName, mimeType, buffer: documentBuffer });

  if (kind === "doc") {
    return {
      ok: false,
      status: 415,
      code: "LEGACY_DOC_UNSUPPORTED",
      message: "当前 workflow 暂不支持旧版 .doc 二进制文件，请转换为 .docx、.pdf 或 .txt 后重新上传。"
    };
  }

  if (kind === "text") {
    const text = normalizeText(documentBuffer.toString("utf8")).slice(0, MAX_MODEL_TEXT_CHARS);
    return {
      ok: true,
      text,
      textExtraction: {
        kind,
        extractor: "native",
        textLength: text.length,
        summary: extractionSummary({ kind, text, metadata: {} })
      }
    };
  }

  const extracted = await runPythonExtractor({ buffer: documentBuffer, kind, fileName });
  if (!extracted.ok) {
    return {
      ok: false,
      status: 422,
      ...extracted
    };
  }

  if (!extracted.text.trim()) {
    return {
      ok: false,
      status: 422,
      code: "RESUME_TEXT_EXTRACTION_EMPTY",
      message:
        kind === "pdf"
          ? "这个 PDF 没有可提取的文字层，DeepSeek 无法稳定解析。请先进行 OCR，或上传可复制文本的 PDF/DOCX/TXT。"
          : "这个文档没有提取到可用简历文本，请换成可复制文本的 PDF/DOCX/TXT。"
    };
  }

  return {
    ok: true,
    text: extracted.text,
    textExtraction: {
      kind,
      extractor: extracted.extractor,
      metadata: extracted.metadata,
      textLength: extracted.text.length,
      summary: extractionSummary({ kind, text: extracted.text, metadata: extracted.metadata })
    }
  };
}

export async function extractResumeTextFromFile(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractResumeTextFromBuffer({
    buffer,
    fileName: file.name,
    mimeType: file.type || ""
  });
}
