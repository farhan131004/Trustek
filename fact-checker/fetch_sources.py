import os
import requests
from typing import List, Dict
from dotenv import load_dotenv
import os
from functools import lru_cache

# Load .env file automatically
load_dotenv()


NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BING_API_KEY = os.getenv("BING_API_KEY")


def search_web(query: str, max_results: int = 10) -> List[Dict]:
    """Search news via NewsAPI. Returns a list of article dicts.
    Falls back to empty list if no API key or request fails.
    """
    if not NEWS_API_KEY:
        return []
    try:
        url = (
            "https://newsapi.org/v2/everything"
            f"?q={requests.utils.quote(query)}&pageSize={max_results}&language=en&sortBy=publishedAt"
        )
        headers = {"X-Api-Key": NEWS_API_KEY}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json() or {}
        articles = data.get("articles", [])
        # Normalize
        normalized = []
        for a in articles:
            normalized.append(
                {
                    "title": a.get("title"),
                    "description": a.get("description"),
                    "url": a.get("url"),
                    "source": (a.get("source") or {}).get("name"),
                    "publishedAt": a.get("publishedAt"),
                }
            )
        return normalized
    except Exception:
        return []


def search_web_bing(query: str, max_results: int = 10) -> List[Dict]:
    """Search the web using Bing Web Search API. Returns list of normalized results.
    Falls back to empty list if no API key or on error."""
    if not BING_API_KEY:
        return []
    try:
        endpoint = "https://api.bing.microsoft.com/v7.0/search"
        headers = {"Ocp-Apim-Subscription-Key": BING_API_KEY}
        params = {"q": query, "mkt": "en-US", "count": max_results}
        resp = requests.get(endpoint, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json() or {}
        web_pages = (data.get("webPages") or {}).get("value", [])
        normalized = []
        for item in web_pages:
            normalized.append(
                {
                    "title": item.get("name"),
                    "description": item.get("snippet"),
                    "url": item.get("url"),
                    "source": item.get("displayUrl"),
                    "publishedAt": None,
                }
            )
        return normalized
    except Exception:
        return []


@lru_cache(maxsize=128)
def search_web_multi(query: str, max_results: int = 10) -> List[Dict]:
    """Combine NewsAPI and Bing results, deduplicate by URL, limit to max_results."""
    results: List[Dict] = []
    seen = set()

    for provider in (search_web, search_web_bing):
        try:
            items = provider(query, max_results=max_results)
        except TypeError:
            # provider without max_results signature (defensive)
            items = provider(query)  # type: ignore
        for it in items:
            url = (it or {}).get("url")
            if url and url not in seen:
                seen.add(url)
                results.append(it)
            if len(results) >= max_results:
                break
        if len(results) >= max_results:
            break

    return results


# ---- Phase 2: Expanded queries + evidence retrieval with reranking ----
def expand_queries(claim: str) -> List[str]:
    """Generate expanded search queries for higher recall."""
    claim = (claim or "").strip()
    extras = [
        "fact check",
        "official statement",
        "press release",
        "clarification",
        "report",
    ]
    return [f"{claim} {e}" for e in extras] + [claim]


def search_evidence_for_claim(claim: str, max_results: int = 15) -> List[Dict]:
    """Recall: run expanded queries, merge and deduplicate.
    Rerank: keyword overlap between claim and (title+description)."""
    import re
    queries = expand_queries(claim)
    pool: List[Dict] = []
    seen = set()
    for q in queries:
        items = search_web_multi(q, max_results=10)
        for it in items:
            url = (it or {}).get("url")
            if not url or url in seen:
                continue
            seen.add(url)
            pool.append(it)
            if len(pool) >= max_results * 2:
                break
        if len(pool) >= max_results * 2:
            break

    # lightweight rerank by keyword overlap
    claim_tokens = set(re.findall(r"[a-zA-Z][a-zA-Z\-']+", (claim or '').lower()))
    def score_item(it: Dict) -> int:
        blob = f"{it.get('title','')} {it.get('description','')}".lower()
        words = set(re.findall(r"[a-zA-Z][a-zA-Z\-']+", blob))
        return len(words & claim_tokens)

    pool.sort(key=score_item, reverse=True)
    return pool[:max_results]
