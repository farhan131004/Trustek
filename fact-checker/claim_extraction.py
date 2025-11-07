import re
from typing import List

def extract_claims(text: str, max_claims: int = 3) -> List[str]:
    if not text:
        return []
    sents = re.split(r'(?<=[.!?])\s+', text.strip())
    if not sents:
        return []
    candidates = []
    for s in sents[:8]:
        if re.search(r"\d|caus(?:e|ed|es)|lead(?:s|ing)? to|announc|claim|declare|percent|%|billion|million", s, re.I):
            candidates.append(s)
    if not candidates:
        candidates = sents[:1]
    return candidates[:max_claims]
