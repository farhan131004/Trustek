from fastapi import FastAPI, HTTPException, UploadFile, File, Form
import time
import logging
from pydantic import BaseModel
from typing import Optional
from app import verify_news, verify_article   # reuse your existing pipeline
import uvicorn

# Optional OCR dependencies
try:
    from PIL import Image
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover
    Image = None  # type: ignore
    pytesseract = None  # type: ignore

app = FastAPI(title="Fact Checker API", version="1.0")

# Input model
class NewsRequest(BaseModel):
    text: str
    source_url: Optional[str] = None

class UrlRequest(BaseModel):
    url: str
    max_preview_chars: int = 5000

# Output model
class NewsResponse(BaseModel):
    input: str
    source_url: Optional[str] = None
    verification: dict
    bias: dict
    final: dict
    detailed_analysis: dict
    confidence_score: float
    recommendations: list
    scan_details: dict
    trust_verification: dict
    # Optional fields for image OCR flow
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    # Optional fields for URL extraction flow
    full_text_preview: Optional[str] = None
    safe_reasons: Optional[list] = None


@app.post("/verify", response_model=NewsResponse)
async def verify(request: NewsRequest):
    try:
        t0 = time.time()
        result = verify_article(request.text, request.source_url)
        dt_ms = int((time.time() - t0) * 1000)
        try:
            stance_totals = ((result.get("scan_details") or {}).get("claim_verdict") or {}).get("stance_totals") or {}
            logging.getLogger(__name__).info(
                f"/verify verdict={((result.get('scan_details') or {}).get('claim_verdict') or {}).get('verdict')} "
                f"latency_ms={dt_ms} stance={stance_totals}"
            )
        except Exception:
            pass
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify-image", response_model=NewsResponse)
async def verify_image(file: UploadFile = File(...), source_url: Optional[str] = Form(None)):
    """Accept an image, run OCR to extract text, and pass to verify_news."""
    try:
        if pytesseract is None or Image is None:
            raise HTTPException(
                status_code=500,
                detail="OCR dependencies missing. Please install pillow and pytesseract."
            )

        content = await file.read()
        from io import BytesIO
        img = Image.open(BytesIO(content)).convert("RGB")

        # Basic OCR; pytesseract returns only text; confidence requires tsv parsing (optional)
        text = pytesseract.image_to_string(img)

        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in image.")

        base_result = verify_news(text.strip(), source_url)
        # Attach OCR context
        base_result["ocr_text"] = text.strip()
        # Optional: try confidence via tsv; fallback to None
        try:
            tsv = pytesseract.image_to_data(img, output_type=getattr(pytesseract, 'Output').DICT)
            confs = [float(c) for c in tsv.get('conf', []) if c not in ("-1", None, "")]
            base_result["ocr_confidence"] = round(sum(confs)/len(confs), 2) if confs else None
        except Exception:
            base_result["ocr_confidence"] = None

        return base_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract_text_from_url(url: str) -> str:
    """Fetch a URL and return a readable text body. Uses BeautifulSoup if available.
    Falls back to naive HTML stripping.
    """
    import re
    import requests
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        })
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {e}")

    text = None
    try:
        from bs4 import BeautifulSoup  # type: ignore
        soup = BeautifulSoup(html, "html.parser")
        # Remove script/style
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        # Prefer article/main if present
        candidate = soup.find("article") or soup.find("main") or soup.body or soup
        text = candidate.get_text(separator=" ", strip=True)
    except Exception:
        # Fallback: strip tags
        text = re.sub(r"<[^>]+>", " ", html)

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text or "").strip()
    return text


def _build_safe_reasons(result: dict) -> list:
    """Derive human-friendly reasons why content appears safe."""
    reasons = []
    try:
        trust = (result.get("trust_verification") or {}).get("trust_level", 0.0)
        source_domain = (result.get("trust_verification") or {}).get("domain")
        details = (result.get("scan_details") or {})
        cross = (details.get("cross_verification_details") or {})
        confirmed = cross.get("confirmed_count", 0)
        bias = result.get("bias") or {}
        sensational = bias.get("sensational_count", 0)

        if trust >= 0.8:
            reasons.append(f"Source domain {source_domain} is highly trusted.")
        if confirmed > 0:
            reasons.append(f"Found corroboration from {confirmed} external source(s).")
        if sensational == 0:
            reasons.append("No sensational or clickbait indicators detected in the text.")
        feedback = details.get("corroboration_feedback")
        if feedback:
            reasons.append(feedback)
    except Exception:
        pass
    # Ensure at least one message
    return reasons or ["No red flags detected in source credibility or language analysis."]


@app.post("/verify-url", response_model=NewsResponse)
async def verify_url(payload: UrlRequest):
    """Fetch URL, extract text for preview, pass to verify_news and attach reasons."""
    try:
        text = _extract_text_from_url(payload.url)
        if not text:
            raise HTTPException(status_code=400, detail="No readable text extracted from the URL.")

        result = verify_news(text, payload.url)
        # Attach preview and safe reasons
        preview = text[: max(0, min(payload.max_preview_chars, len(text))) ]
        result["full_text_preview"] = preview
        result["safe_reasons"] = _build_safe_reasons(result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def home():
    return {"message": "✅ Fact-Checker API is running!"}


if __name__ == "__main__":
    # run locally: python server.py
    uvicorn.run(app, host="0.0.0.0", port=8000)
