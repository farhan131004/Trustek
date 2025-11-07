import json
import os
from typing import Optional

try:
    import tldextract  # type: ignore
except Exception:  # pragma: no cover
    tldextract = None

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "trusted_sources.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    sources = json.load(f)


def _domain_from_url(url: str) -> Optional[str]:
    if not url:
        return None
    if tldextract:
        ext = tldextract.extract(url)
        return ext.registered_domain or None
    # Fallback: naive extraction
    try:
        from urllib.parse import urlparse

        netloc = urlparse(url).netloc
        parts = netloc.split(":")[0].split(".")
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return netloc or None
    except Exception:
        return None


def get_source_rank(url: str) -> int:
    domain = _domain_from_url(url) or ""
    if domain in sources.get("high", []):
        return 3
    if domain in sources.get("medium", []):
        return 2
    return 1
