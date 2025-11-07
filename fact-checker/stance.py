import os
import requests
import time
from functools import lru_cache
from typing import Tuple

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
except Exception:  # pragma: no cover
    AutoTokenizer = None  # type: ignore
    AutoModelForSequenceClassification = None  # type: ignore
    torch = None  # type: ignore

_MODEL = None
_TOKENIZER = None
_DEVICE = None

# Environment override for model name (optional)
_MODEL_NAME = os.getenv(
    "FACTCHECK_NLI_MODEL",
    # good quality; switch to roberta-large-mnli if resources are limited
    "ynie/roberta-large-snli_mnli_fever_anli_R1_R2_R3-nli",
)


# Remote ML service (preferred if available)
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

# Circuit breaker state (module-level)
_CB_FAILS = 0
_CB_OPEN_UNTIL = 0.0
_CB_THRESHOLD = int(os.getenv("ML_CB_THRESHOLD", "3"))
_CB_COOLDOWN = float(os.getenv("ML_CB_COOLDOWN_SECONDS", "30"))


def call_ml_service(claim: str, evidence: str) -> dict:
    global _CB_FAILS, _CB_OPEN_UNTIL
    now = time.time()
    # Short-circuit if breaker is open
    if _CB_OPEN_UNTIL and now < _CB_OPEN_UNTIL:
        return {"stance": "neutral", "score": 0.0}

    url = f"{ML_SERVICE_URL.rstrip('/')}/infer-nli"
    payload = {"claim": claim, "evidence": evidence}
    backoffs = [0.5, 1.0, 2.0]
    for i, delay in enumerate(backoffs, start=1):
        try:
            res = requests.post(url, json=payload, timeout=8)
            if res.status_code == 200:
                data = res.json() or {}
                stance = (data.get("stance") or "neutral").lower()
                score = float(data.get("score") or 0.0)
                # Success: reset breaker
                _CB_FAILS = 0
                _CB_OPEN_UNTIL = 0.0
                return {"stance": stance, "score": score}
            # retry on 5xx
            if 500 <= res.status_code < 600:
                time.sleep(delay)
                continue
            break
        except Exception as e:
            if i < len(backoffs):
                time.sleep(delay)
                continue
            print(f"[!] ML service call failed: {e}")
    # Failure path: bump breaker
    _CB_FAILS += 1
    if _CB_FAILS >= _CB_THRESHOLD:
        _CB_OPEN_UNTIL = time.time() + _CB_COOLDOWN
    return {"stance": "neutral", "score": 0.0}


def _available() -> bool:
    return AutoTokenizer is not None and AutoModelForSequenceClassification is not None


def _load():
    global _MODEL, _TOKENIZER, _DEVICE
    if not _available():
        return False
    if _MODEL is not None:
        return True
    try:
        _DEVICE = "cuda" if torch and torch.cuda.is_available() else "cpu"
        _TOKENIZER = AutoTokenizer.from_pretrained(_MODEL_NAME)
        _MODEL = AutoModelForSequenceClassification.from_pretrained(_MODEL_NAME)
        if torch:
            _MODEL.to(_DEVICE)
        _MODEL.eval()
        return True
    except Exception:
        _MODEL = None
        _TOKENIZER = None
        return False


@lru_cache(maxsize=2048)
def nli_stance(claim: str, text: str) -> Tuple[str, float]:
    """Return (label, score) using NLI. Labels: entailment, contradiction, neutral.
    Falls back to neutral if model unavailable or on error.
    """
    if not _load():
        return ("neutral", 0.0)
    try:
        import torch  # local alias to satisfy type checkers
        inputs = _TOKENIZER(
            claim or "",
            text or "",
            return_tensors="pt",
            truncation=True,
            max_length=256,
            padding=True,
        )
        if _DEVICE:
            inputs = {k: v.to(_DEVICE) for k, v in inputs.items()}
        with torch.no_grad():
            logits = _MODEL(**inputs).logits[0]
            probs = torch.softmax(logits, dim=-1).tolist()
        # Common ordering: [contradiction, neutral, entailment]
        labels = ["contradiction", "neutral", "entailment"]
        idx = int(max(range(3), key=lambda i: probs[i]))
        return labels[idx], float(probs[idx])
    except Exception:
        return ("neutral", 0.0)
