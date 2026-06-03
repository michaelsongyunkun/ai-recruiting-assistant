import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree


WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def normalize(text):
    return "\n".join(line.rstrip() for line in str(text or "").splitlines()).strip()


def extract_pdf(path):
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            pass

    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = normalize(page.extract_text() or "")
        if text:
            pages.append(text)

    return {
        "text": normalize("\n\n".join(pages)),
        "metadata": {
            "pageCount": len(reader.pages),
            "pagesWithText": len(pages)
        }
    }


def text_from_xml(xml_bytes):
    root = ElementTree.fromstring(xml_bytes)
    paragraphs = []
    for paragraph in root.iter(f"{WORD_NS}p"):
        parts = []
        for node in paragraph.iter():
            if node.tag == f"{WORD_NS}t" and node.text:
                parts.append(node.text)
            elif node.tag == f"{WORD_NS}tab":
                parts.append("\t")
            elif node.tag == f"{WORD_NS}br":
                parts.append("\n")
        line = "".join(parts).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def extract_docx(path):
    text_parts = []
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        document_names = ["word/document.xml"]
        document_names.extend(sorted(name for name in names if name.startswith("word/header") and name.endswith(".xml")))
        document_names.extend(sorted(name for name in names if name.startswith("word/footer") and name.endswith(".xml")))

        for name in document_names:
            if name in names:
                part = normalize(text_from_xml(archive.read(name)))
                if part:
                    text_parts.append(part)

    return {
        "text": normalize("\n\n".join(text_parts)),
        "metadata": {
            "documentParts": len(text_parts)
        }
    }


def main():
    if len(sys.argv) < 3:
        raise ValueError("Usage: extract-document-text.py <path> <kind>")

    path = Path(sys.argv[1])
    kind = sys.argv[2].lower()

    if kind == "pdf":
        payload = extract_pdf(path)
    elif kind == "docx":
        payload = extract_docx(path)
    else:
        raise ValueError(f"Unsupported document kind: {kind}")

    print(json.dumps({"ok": True, **payload}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                    "errorType": error.__class__.__name__
                },
                ensure_ascii=False
            )
        )
        sys.exit(1)
