import base64
import io
from pypdf import PdfReader


def load_pdf(base64_content: str) -> dict:
    """
    Accepts base64-encoded PDF content.
    Returns: { "text": extracted text, "pages": page count }
    """
    try:
        pdf_bytes = base64.b64decode(base64_content)
    except Exception:
        raise ValueError("Invalid base64 PDF content.")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text.strip())

    if not pages_text:
        raise ValueError("Could not extract text from PDF. The file may be scanned or image-based.")

    full_text = "\n\n".join(pages_text)
    return {"text": full_text, "pages": len(reader.pages)}
