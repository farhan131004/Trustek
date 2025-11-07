from typing import Dict
import re

try:
    from transformers import pipeline  # type: ignore

    # Use a small, public, CPU-friendly model that always works
    model_name = "distilbert-base-uncased-finetuned-sst-2-english"
    _sentiment = pipeline("text-classification", model=model_name)
except Exception:  # pragma: no cover
    _sentiment = None

_SENSATIONAL = [
    "shocking",
    "breaking",
    "secret",
    "exposed",
    "scam",
    "unbelievable",
    "disaster",
    "cover-up",
]


def _simple_sentiment(text: str) -> str:
    positive_words = ["good", "true", "confirmed", "official"]
    negative_words = ["fake", "lie", "hoax", "scam", "fraud", "panic"]
    p = sum(text.lower().count(w) for w in positive_words)
    n = sum(text.lower().count(w) for w in negative_words)
    if n > p:
        return "NEGATIVE"
    if p > n:
        return "POSITIVE"
    return "NEUTRAL"


def check_bias(text: str) -> Dict[str, str | int]:
    t = text or ""
    sensational_count = sum(1 for w in _SENSATIONAL if w in t.lower())

    # excessive uppercase words heuristic
    caps_words = re.findall(r"\b[A-Z]{5,}\b", t)
    sensational_count += len(caps_words)

    if _sentiment:
        try:
            tone = _sentiment(t)[0]["label"]
        except Exception:
            tone = _simple_sentiment(t)
    else:
        tone = _simple_sentiment(t)

    return {"sensational_count": int(sensational_count), "tone": tone}
