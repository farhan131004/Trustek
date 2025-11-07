from typing import Dict

from fetch_sources import search_web
from credibility_score import get_source_rank


def cross_verify_claim(claim: str) -> Dict[str, int]:
    results = search_web(claim)
    confirmed, disputed = 0, 0

    for article in results:
        url = article.get("url")
        rank = get_source_rank(url) if url else 1
        if rank >= 2:
            confirmed += 1
        else:
            disputed += 1

    return {"confirmed": confirmed, "disputed": disputed}
