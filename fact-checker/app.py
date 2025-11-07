from typing import Any, Dict
import os

from cross_verify import cross_verify_claim
from nlp_check import check_bias
from predict_fake import calculate_final_score

try:
    from transformers import pipeline  # type: ignore
except Exception:  # pragma: no cover
    pipeline = None  # type: ignore

NLI_MODEL_NAME = os.getenv("FACTCHECK_NLI_MODEL", "facebook/bart-large-mnli")
try:
    stance_model = pipeline("text-classification", model=NLI_MODEL_NAME) if pipeline else None
except Exception:
    stance_model = None


def nli_infer(claim: str, evidence_text: str):
    if not stance_model:
        # simple fallback: token overlap ratio
        c = (claim or "").strip()
        e = (evidence_text or "").strip()
        if not c or not e:
            return "neutral", 0.0
        cs = set(c.lower().split())
        es = set(e.lower().split())
        overlap = len(cs & es)
        denom = max(1, len(cs))
        return "neutral", overlap / denom
    try:
        res = stance_model(f"{claim} </s></s> {evidence_text}")[0]
        label = (res.get("label", "neutral")).lower()
        score = float(res.get("score", 0.0))
        return label, score
    except Exception:
        return "neutral", 0.0


def verify_news(text: str, source_url: str = None) -> Dict[str, Any]:
    """
    Comprehensive fact-checking analysis with detailed explanations
    """
    # Get detailed scanning results
    scan_results = detailed_scan_analysis(text, source_url)
    
    verification = scan_results["verification"]
    bias = scan_results["bias"]
    result = calculate_final_score(verification, bias)
    
    # Generate detailed explanations
    explanations = generate_detailed_explanation(verification, bias, result, source_url)
    
    source_analysis = (scan_results or {}).get("scan_details", {}).get("source_analysis", {})
    trust_rank = source_analysis.get("trust_rank")
    domain = source_analysis.get("domain")
    rank_to_score = {3: 0.95, 2: 0.7, 1: 0.3}
    trust_level_numeric = rank_to_score.get(trust_rank, 0.0) if trust_rank is not None else 0.0

    return {
        "input": text,
        "source_url": source_url,
        "verification": verification,
        "bias": bias,
        "final": result,
        "detailed_analysis": explanations,
        "confidence_score": calculate_confidence_score(verification, bias),
        "recommendations": generate_recommendations(result, verification, bias),
        "scan_details": scan_results["scan_details"],
        "trust_verification": {
            "domain": domain,
            "trust_level": trust_level_numeric
        }
    }


def verify_article(text: str, source_url: str = None) -> Dict[str, Any]:
    """Compatibility alias used by the FastAPI server."""
    return verify_news(text, source_url)


def extract_keywords(text: str, max_terms: int = 5) -> list[str]:
    """Extract 3-5 key nouns/phrases heuristically without heavy NLP deps.
    Strategy: keep capitalized words, frequent meaningful tokens, drop stopwords."""
    import re
    stop = set(
        "the a an and or for to of in on with from by as at is are was were be been it this that these those their its your our his her they them you we not".split()
    )
    tokens = re.findall(r"[A-Za-z][A-Za-z\-]{1,}\b", text)
    # Capitalized words (names/places)
    caps = [t for t in tokens if t[0].isupper() and t.lower() not in stop]
    # Lowercase keywords by frequency
    freq = {}
    for t in (tok.lower() for tok in tokens if tok.lower() not in stop):
        freq[t] = freq.get(t, 0) + 1
    common = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    # Build list: prefer capitalized unique, then common lowers
    out: list[str] = []
    for t in caps:
        if t not in out:
            out.append(t)
        if len(out) >= max_terms:
            break
    if len(out) < max_terms:
        for t, _ in common:
            if t.title() not in out and t.upper() not in out:
                out.append(t)
            if len(out) >= max_terms:
                break
    return out[:max_terms]


def fuzzy_similarity(a: str, b: str) -> float:
    """Return fuzzy similarity ratio 0..1 between two strings using difflib."""
    from difflib import SequenceMatcher
    return SequenceMatcher(None, (a or "")[:200].lower(), (b or "")[:200].lower()).ratio()


def _heuristic_stance(claim: str, text: str) -> tuple[str, float]:
    """Lightweight stance approximation without external deps.
    - Uses similarity and basic negation cues to label entailment/contradiction/neutral.
    Returns (label, score in 0..1)."""
    blob = (text or "")
    sim = fuzzy_similarity(claim or "", blob)
    lowered = f"{claim} {blob}".lower()
    neg_cues = ["not ", "no ", "never ", "false", "denies", "refutes", "hoax", "fake"]
    has_neg = any(k in lowered for k in neg_cues)
    if sim >= 0.7 and not has_neg:
        return ("entailment", sim)
    if sim >= 0.55 and has_neg:
        return ("contradiction", sim)
    if sim >= 0.4:
        return ("neutral", sim)
    return ("neutral", sim)


def _snippet_weight_by_trust(url: str, get_rank_fn) -> float:
    """Map source trust rank -> weight."""
    try:
        r = get_rank_fn(url or "")
    except Exception:
        r = 1
    return {3: 1.0, 2: 0.7, 1: 0.4}.get(r, 0.4)


def _parse_date_to_age_days(ds: str) -> float:
    try:
        from datetime import datetime, timezone
        if not ds:
            return 9999.0
        # accept ISO or YYYY-MM-DD prefix
        ds = ds.strip()
        if len(ds) >= 10:
            ds = ds[:10]
        dt = datetime.fromisoformat(ds)
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        return max(0.0, (now - dt).days)
    except Exception:
        return 9999.0


def _date_weight(published_at: str) -> float:
    """Exponential decay with half-life 180 days. Clamp to [0.5, 1.0]."""
    age = _parse_date_to_age_days(published_at)
    import math
    if age >= 9000:
        return 0.7
    w = 0.5 ** (age / 180.0)
    return max(0.5, min(1.0, w))


def _entity_weight(claim: str, text: str) -> float:
    """Overlap of capitalized tokens as a proxy for entity match. Maps to [0.5,1.0]."""
    import re
    caps_claim = set(re.findall(r"\b[A-Z][a-zA-Z\-]{2,}\b", claim or ""))
    caps_text = set(re.findall(r"\b[A-Z][a-zA-Z\-]{2,}\b", text or ""))
    if not caps_claim:
        return 0.8
    overlap = len(caps_claim & caps_text) / max(1, len(caps_claim))
    return max(0.5, min(1.0, 0.5 + overlap))


def _number_weight(claim: str, text: str) -> float:
    """Reward if numbers align; penalize clear conflicts. Returns [0.4,1.0]."""
    import re
    nums_c = re.findall(r"\b\d+(?:\.\d+)?%?\b", (claim or ""))
    nums_t = re.findall(r"\b\d+(?:\.\d+)?%?\b", (text or ""))
    if not nums_c:
        return 0.9
    if not nums_t:
        return 0.7
    def norm(n):
        pct = n.endswith('%')
        val = float(n.rstrip('%'))
        return ('pct' if pct else 'abs', val)
    c_norm = [norm(n) for n in nums_c]
    t_norm = [norm(n) for n in nums_t]
    # check if any claim number is approximately present in text
    def approx(a, b):
        if a[0] != b[0]:
            return False
        if a[0] == 'pct':
            return abs(a[1]-b[1]) <= 3.0
        # absolute tolerance and 5% relative
        return abs(a[1]-b[1]) <= 1.0 or (min(a[1], b[1])>0 and abs(a[1]-b[1])/min(a[1],b[1]) <= 0.05)
    hits = 0
    for a in c_norm:
        if any(approx(a,b) for b in t_norm):
            hits += 1
    ratio = hits / max(1, len(c_norm))
    if ratio == 0:
        return 0.6
    return 0.7 + 0.3*ratio


def _aggregate_verdict(evidence: list, get_rank_fn) -> tuple[str, int, dict]:
    support = 0.0
    refute = 0.0
    neutral = 0.0
    for e in evidence:
        w = _snippet_weight_by_trust(e.get("url", ""), get_rank_fn)
        st = e.get("stance")
        sc = float(e.get("stance_score") or 0.0)
        if st == "entailment":
            support += w * sc
        elif st == "contradiction":
            refute += w * sc
        else:
            neutral += w * sc
    if refute - support >= 0.6:
        verdict = "False"
    elif support - refute >= 0.6:
        verdict = "True"
    elif support > 0.3 and refute > 0.3:
        verdict = "Partly True"
    elif support + refute < 0.2:
        verdict = "Unverified"
    else:
        verdict = "Misleading"
    confidence = max(0, min(100, round((support + refute + neutral) * 50)))
    return verdict, confidence, {"support": round(support, 3), "refute": round(refute, 3), "neutral": round(neutral, 3)}


def _build_explanation(claim: str, verdict: str, evidence: list, confidence: int) -> tuple[str, list]:
    decisive = [e for e in evidence if e.get("stance") in ("entailment", "contradiction")]
    decisive.sort(key=lambda e: float(e.get("stance_score") or 0), reverse=True)
    top = decisive[:2]
    citations = []
    for i, e in enumerate(top, 1):
        citations.append({
            "index": i,
            "source": (e.get("source") or "").strip(),
            "date": (e.get("publishedAt") or "")[:10],
            "url": e.get("url")
        })
    sent1 = f"The claim: {claim.strip()}"
    sent2 = f"Verdict: {verdict}. Based on stance across trusted outlets and corroboration."
    srefs = []
    for i, e in enumerate(top, 1):
        piece = (e.get("description") or e.get("title") or "").strip()
        if piece:
            piece = piece[:140].rstrip(".")
        srefs.append(f"[{i}] {e.get('source','')} ({(e.get('publishedAt') or '')[:10]}): {piece}…")
    sent3 = ("; ".join(srefs)) if srefs else "No decisive sources found."
    sent4 = "Method: compared the claim against trusted outlets and independent reports using stance detection and corroboration."
    para = " ".join([sent1, sent2, sent3, sent4])
    return para, citations


def detailed_scan_analysis(text: str, source_url: str = None) -> Dict[str, Any]:
    """
    Perform detailed scanning with complete visibility into all processes
    """
    from fetch_sources import search_web_multi, search_evidence_for_claim
    from credibility_score import get_source_rank
    
    scan_details = {
        "source_analysis": {},
        "cross_verification_details": {},
        "nlp_analysis": {},
        "prediction_details": {},
        "processing_steps": []
    }
    
    # Step 1: Source credibility analysis
    scan_details["processing_steps"].append("1. Analyzing source credibility")
    if source_url:
        source_rank = get_source_rank(source_url)
        trust_levels = {3: "High", 2: "Medium", 1: "Low"}
        scan_details["source_analysis"] = {
            "url": source_url,
            "domain": source_url.split("//")[-1].split("/")[0] if source_url else None,
            "trust_rank": source_rank,
            "trust_level": trust_levels[source_rank],
            "in_trusted_db": source_rank > 1
        }
    else:
        scan_details["source_analysis"] = {
            "url": None,
            "message": "No source URL provided for analysis"
        }
    
    # Step 2: Cross-verification with detailed source tracking
    scan_details["processing_steps"].append("2. Cross-verifying with external sources")
    # Build smarter query: title + 3-5 key terms
    keywords = extract_keywords(text, max_terms=5)
    query = (text[:80] + "...") if len(text) > 80 else text
    if keywords:
        query = f"{query} " + " ".join(keywords)
    articles = search_web_multi(query, max_results=10)
    
    cross_details = {
        "search_query": text[:100] + "..." if len(text) > 100 else text,
        "articles_found": len(articles),
        "source_breakdown": [],
        "confirmed_count": 0,
        "disputed_count": 0
    }
    
    for article in articles:
        article_url = article.get("url", "")
        article_rank = get_source_rank(article_url) if article_url else 1
        
        # Complete analysis for each individual URL
        source_info = analyze_individual_source(article, article_url, article_rank, text)
        
        # Fuzzy headline matching to detect similar stories
        title = (article.get("title") or "")
        sim = fuzzy_similarity(text, title)
        keyword_hits = len(set((k.lower() for k in keywords)) & set(title.lower().split()))
        is_similar = sim >= 0.6 or keyword_hits >= max(1, len(keywords)//2)

        if article_rank >= 2 and is_similar:
            cross_details["confirmed_count"] += 1
            source_info["classification"] = "Confirming (Trusted & Similar)"
            source_info["match_score"] = sim
        elif is_similar:
            cross_details["confirmed_count"] += 1
            source_info["classification"] = "Confirming (Similar)"
            source_info["match_score"] = sim
        else:
            cross_details["disputed_count"] += 1
            source_info["classification"] = "No strong corroboration"
            source_info["match_score"] = sim
            
        cross_details["source_breakdown"].append(source_info)
    
    # Claim extraction and stance-based verdict (Phase 3)
    from claim_extraction import extract_claims
    claims = extract_claims(text, max_claims=3)
    primary_claim = claims[0] if claims else (text[:160] + "..." if len(text) > 160 else text)
    scan_details["claims"] = claims

    # Build evidence list: use expanded queries + reranking
    # Prefer remote ml-service stance; fallback to local NLI, then pipeline/fallback
    _remote_stance = None
    _local_nli = None
    try:
        from stance import call_ml_service as _remote_stance  # type: ignore
    except Exception:
        _remote_stance = None
    try:
        from stance import nli_stance as _local_nli  # type: ignore
    except Exception:
        _local_nli = None

    evidence_articles = search_evidence_for_claim(primary_claim, max_results=15)
    evidence = []
    for art in evidence_articles:
        ev_text = f"{art.get('title','')} {art.get('description','')}".strip()
        if not ev_text:
            continue
        # Stance scoring with remote first, then local NLI, then pipeline fallback
        stance_label = "neutral"
        stance_score = 0.0
        used_remote = False
        if _remote_stance:
            try:
                _res = _remote_stance(primary_claim, ev_text) or {}
                stance_label = (_res.get("stance") or "neutral").lower()
                stance_score = float(_res.get("score") or 0.0)
                used_remote = True
            except Exception:
                used_remote = False
        if not used_remote and _local_nli:
            try:
                stance_label, stance_score = _local_nli(primary_claim, ev_text)
            except Exception:
                stance_label, stance_score = nli_infer(primary_claim, ev_text)
        elif not used_remote:
            stance_label, stance_score = nli_infer(primary_claim, ev_text)
        w_trust = _snippet_weight_by_trust(art.get("url",""), get_source_rank)
        w_date = _date_weight(art.get("publishedAt") or "")
        w_entity = _entity_weight(primary_claim, ev_text)
        w_num = _number_weight(primary_claim, ev_text)
        w_combined = round(w_trust * w_date * w_entity * w_num, 4)
        evidence.append({
            "title": art.get("title"),
            "description": art.get("description"),
            "url": art.get("url"),
            "source": art.get("source"),
            "publishedAt": art.get("publishedAt"),
            "stance": stance_label,
            "stance_score": stance_score,
            "weights": {
                "trust": round(w_trust,3),
                "date": round(w_date,3),
                "entity": round(w_entity,3),
                "number": round(w_num,3),
                "combined": w_combined
            }
        })

    # Enhanced aggregation using combined weights when present
    support = 0.0
    refute = 0.0
    neutral = 0.0
    for e in evidence:
        base = float(e.get("stance_score") or 0.0)
        mult = float(((e.get("weights") or {}).get("combined")) or _snippet_weight_by_trust(e.get("url",""), get_source_rank))
        if e.get("stance") == "entailment":
            support += base * mult
        elif e.get("stance") == "contradiction":
            refute += base * mult
        else:
            neutral += base * mult
    if refute - support >= 0.6:
        verdict = "False"
    elif support - refute >= 0.6:
        verdict = "True"
    elif support > 0.3 and refute > 0.3:
        verdict = "Partly True"
    elif support + refute < 0.2:
        verdict = "Unverified"
    else:
        verdict = "Misleading"
    verdict_conf = max(0, min(100, round((support + refute + neutral) * 50)))
    stance_totals = {"support": round(support,3), "refute": round(refute,3), "neutral": round(neutral,3)}
    explanation, citations = _build_explanation(primary_claim, verdict, evidence, verdict_conf)

    scan_details["processing_steps"].append("2b. Computing claim verdict from stance analysis")
    scan_details["claim_verdict"] = {
        "primary_claim": primary_claim,
        "verdict": verdict,
        "confidence": verdict_conf,
        "stance_totals": stance_totals,
        "citations": citations,
        "evidence_count": len(evidence),
        "thresholds": {"true_minus_false": 0.6, "min_mixed": 0.3, "min_activity": 0.2},
        "weights_used": True
    }

    scan_details["cross_verification_details"] = cross_details
    
    # Step 3: NLP and bias analysis
    scan_details["processing_steps"].append("3. Performing NLP and bias analysis")
    bias_result = check_bias(text)
    
    scan_details["nlp_analysis"] = {
        "sentiment_tone": bias_result.get("tone", "Unknown"),
        "sensational_count": bias_result.get("sensational_count", 0),
        "text_length": len(text),
        "word_count": len(text.split()),
        "analysis_method": "AI Model + Heuristics",
        "bias_indicators": identify_bias_details(text, bias_result)
    }
    
    # Step 4: Final prediction details with trusted-source fallback
    scan_details["processing_steps"].append("4. Calculating final prediction")
    verification = {"confirmed": cross_details["confirmed_count"], "disputed": cross_details["disputed_count"]}
    
    # Trusted source fallback logic for credibility feedback
    trust_to_score = {3: 1.0, 2: 0.7, 1: 0.3}
    original_trust = trust_to_score.get(get_source_rank(source_url), 0.0) if source_url else 0.0
    low_corr = cross_details["confirmed_count"] == 0
    if low_corr and original_trust >= 0.8:
        scan_details["corroboration_feedback"] = (
            "Limited corroboration found, but source has a strong trust record. Credibility set to medium."
        )
        scan_details["credibility_override"] = "medium"
    elif low_corr:
        scan_details["corroboration_feedback"] = (
            "Low corroboration detected. Article may still be accurate but lacks supporting coverage."
        )
    else:
        scan_details["corroboration_feedback"] = "Adequate corroboration found across external sources."

    scan_details["prediction_details"] = {
        "base_score": cross_details["confirmed_count"] - cross_details["disputed_count"],
        "sensational_penalty": bias_result.get("sensational_count", 0),
        "calculation": f"({cross_details['confirmed_count']} confirmed - {cross_details['disputed_count']} disputed) * 2 - {bias_result.get('sensational_count', 0)} sensational",
        "factors_considered": [
            "Source credibility rankings",
            "Cross-verification results", 
            "Sentiment analysis",
            "Sensational language detection"
        ]
    }
    
    return {
        "verification": verification,
        "bias": bias_result,
        "scan_details": scan_details
    }


def analyze_individual_source(article: Dict, article_url: str, article_rank: int, original_text: str) -> Dict[str, Any]:
    """Complete transparency analysis for each individual URL/source"""
    import re
    from credibility_score import get_source_rank
    
    # Extract domain for detailed analysis
    domain = article_url.split("//")[-1].split("/")[0] if article_url else "unknown"
    
    # Trust verification details
    trust_levels = {3: "High", 2: "Medium", 1: "Low"}
    trust_analysis = {
        "exact_trust_ranking": article_rank,
        "trust_level": trust_levels.get(article_rank, "Unknown"),
        "in_trusted_database": article_rank > 1,
        "domain_extracted": domain,
        "credibility_explanation": f"Domain '{domain}' has trust rank {article_rank} ({'trusted' if article_rank > 1 else 'untrusted'} source)"
    }
    
    # Content analysis for this specific article
    article_title = article.get("title", "")
    article_desc = article.get("description", "")
    combined_content = f"{article_title} {article_desc}".lower()
    
    # Bias detection for this article's content
    sensational_words = ["shocking", "breaking", "secret", "exposed", "scam", "unbelievable", "disaster", "cover-up"]
    found_sensational = [word for word in sensational_words if word in combined_content]
    
    caps_words = re.findall(r"\b[A-Z]{5,}\b", article_title + " " + article_desc)
    
    bias_analysis = {
        "sensational_words_detected": found_sensational,
        "excessive_caps_found": caps_words,
        "sensational_count": len(found_sensational),
        "text_patterns_in_article": {
            "has_excessive_punctuation": "!!!" in combined_content or "???" in combined_content,
            "has_all_caps_words": len(caps_words) > 0,
            "question_heavy": combined_content.count("?") > 2,
            "clickbait_indicators": any(word in combined_content for word in ["you won't believe", "shocking truth", "doctors hate", "one weird trick"])
        },
        "bias_score_for_article": len(found_sensational) + len(caps_words)
    }
    
    # Relevance analysis - how well does this article match the original claim
    original_words = set(original_text.lower().split())
    article_words = set(combined_content.split())
    common_words = original_words.intersection(article_words)
    
    relevance_analysis = {
        "word_overlap_count": len(common_words),
        "relevance_percentage": round((len(common_words) / len(original_words)) * 100, 2) if original_words else 0,
        "matching_keywords": list(common_words)[:10],  # Show first 10 matching words
        "relevance_score": "High" if len(common_words) > len(original_words) * 0.3 else "Medium" if len(common_words) > len(original_words) * 0.1 else "Low"
    }
    
    # Source verification process
    verification_process = {
        "step_1_domain_extraction": f"Extracted domain: {domain}",
        "step_2_trust_lookup": f"Looked up trust ranking in database: {article_rank}",
        "step_3_content_analysis": f"Analyzed title and description for bias indicators",
        "step_4_relevance_check": f"Checked relevance to original claim: {relevance_analysis['relevance_score']}",
        "step_5_classification": "Confirming (Trusted Source)" if article_rank >= 2 else "Disputed/Unknown Source"
    }
    
    # Final scoring calculation for this source
    source_score_calculation = {
        "base_trust_score": article_rank,
        "bias_penalty": bias_analysis["bias_score_for_article"],
        "relevance_bonus": 1 if relevance_analysis["relevance_percentage"] > 30 else 0,
        "final_source_score": max(0, article_rank - bias_analysis["bias_score_for_article"] + (1 if relevance_analysis["relevance_percentage"] > 30 else 0)),
        "calculation_formula": f"{article_rank} (trust) - {bias_analysis['bias_score_for_article']} (bias) + {1 if relevance_analysis['relevance_percentage'] > 30 else 0} (relevance)"
    }
    
    return {
        # Basic article info
        "title": article.get("title", "Unknown"),
        "source": article.get("source", "Unknown"),
        "url": article_url,
        "published": article.get("publishedAt", "Unknown"),
        "description": article.get("description", "")[:200] + "..." if article.get("description", "") else "",
        
        # Complete transparency details for this URL
        "trust_verification": trust_analysis,
        "bias_detection": bias_analysis,
        "relevance_analysis": relevance_analysis,
        "verification_process": verification_process,
        "source_score_calculation": source_score_calculation,
        
        # Summary for this source
        "individual_source_summary": {
            "trust_level": trust_analysis["trust_level"],
            "bias_indicators_found": len(found_sensational) + len(caps_words),
            "relevance_to_claim": relevance_analysis["relevance_score"],
            "final_assessment": "RELIABLE" if article_rank >= 2 and bias_analysis["bias_score_for_article"] < 3 else "QUESTIONABLE",
            "contributes_to_verdict": "CONFIRM" if article_rank >= 2 else "DISPUTE"
        }
    }


def identify_bias_details(text: str, bias_result: Dict) -> Dict[str, Any]:
    """Identify specific bias indicators in the text"""
    import re
    
    sensational_words = ["shocking", "breaking", "secret", "exposed", "scam", "unbelievable", "disaster", "cover-up"]
    
    found_sensational = []
    for word in sensational_words:
        if word in text.lower():
            found_sensational.append(word)
    
    caps_words = re.findall(r"\b[A-Z]{5,}\b", text)
    
    return {
        "sensational_words_found": found_sensational,
        "excessive_caps": caps_words,
        "tone_analysis": bias_result.get("tone", "Unknown"),
        "bias_score": bias_result.get("sensational_count", 0),
        "text_patterns": {
            "has_excessive_punctuation": "!!!" in text or "???" in text,
            "has_all_caps_sentences": bool(re.search(r"[A-Z\s]{20,}", text)),
            "question_heavy": text.count("?") > 3
        }
    }


def generate_detailed_explanation(verification: Dict, bias: Dict, result: Dict, source_url: str = None) -> Dict[str, Any]:
    """Generate comprehensive explanations for the fact-check results"""
    
    explanations = {
        "source_credibility": explain_source_credibility(verification, source_url),
        "content_analysis": explain_content_analysis(bias),
        "cross_verification": explain_cross_verification(verification),
        "final_verdict": explain_final_verdict(result),
        "red_flags": identify_red_flags(bias, verification),
        "supporting_evidence": get_supporting_evidence(verification)
    }
    
    return explanations


def explain_source_credibility(verification: Dict, source_url: str = None) -> Dict[str, Any]:
    """Explain source credibility analysis"""
    confirmed = verification.get("confirmed", 0)
    disputed = verification.get("disputed", 0)
    total_sources = confirmed + disputed
    
    if source_url:
        from credibility_score import get_source_rank
        source_rank = get_source_rank(source_url)
        source_trust_level = {3: "High", 2: "Medium", 1: "Low"}[source_rank]
    else:
        source_trust_level = "Unknown"
        source_rank = 0
    
    return {
        "source_trust_level": source_trust_level,
        "source_rank": source_rank,
        "cross_reference_sources": total_sources,
        "confirming_sources": confirmed,
        "disputing_sources": disputed,
        "explanation": f"Found {confirmed} sources confirming and {disputed} sources disputing this claim. " +
                      (f"Original source has {source_trust_level.lower()} credibility." if source_url else "No original source provided.")
    }


def explain_content_analysis(bias: Dict) -> Dict[str, Any]:
    """Explain content bias and sentiment analysis"""
    tone = bias.get("tone", "Unknown")
    sensational_count = bias.get("sensational_count", 0)
    
    analysis = {
        "sentiment_tone": tone,
        "sensational_language": sensational_count,
        "bias_indicators": [],
        "explanation": ""
    }
    
    if sensational_count > 0:
        analysis["bias_indicators"].append(f"Contains {sensational_count} sensational words/phrases")
    
    if tone in ["FAKE", "NEGATIVE"]:
        analysis["bias_indicators"].append("Language patterns suggest potential misinformation")
    elif tone in ["REAL", "POSITIVE"]:
        analysis["bias_indicators"].append("Language patterns suggest legitimate content")
    
    analysis["explanation"] = f"Content analysis shows {tone.lower()} sentiment with {sensational_count} sensational elements. " + \
                             ("Higher sensational language may indicate bias or misinformation." if sensational_count > 2 else "Language appears relatively neutral.")
    
    return analysis


def explain_cross_verification(verification: Dict) -> Dict[str, Any]:
    """Explain cross-verification process"""
    confirmed = verification.get("confirmed", 0)
    disputed = verification.get("disputed", 0)
    
    return {
        "process": "Cross-referenced claim against multiple news sources",
        "sources_found": confirmed + disputed,
        "agreement_ratio": confirmed / (confirmed + disputed) if (confirmed + disputed) > 0 else 0,
        "explanation": f"Searched reputable news sources and found {confirmed} confirming and {disputed} disputing sources. " +
                      ("Strong consensus supports the claim." if confirmed > disputed else 
                       "Mixed or negative consensus regarding the claim." if disputed >= confirmed else
                       "Limited sources available for verification.")
    }


def explain_final_verdict(result: Dict) -> Dict[str, Any]:
    """Explain the final verdict calculation"""
    score = result.get("score", 0)
    verdict = result.get("verdict", "Unknown")
    
    return {
        "verdict": verdict,
        "confidence_level": "High" if abs(score) >= 3 else "Medium" if abs(score) >= 1 else "Low",
        "score": score,
        "explanation": f"Final verdict: {verdict} (Score: {score}). " +
                      ("High confidence in assessment." if abs(score) >= 3 else
                       "Moderate confidence in assessment." if abs(score) >= 1 else
                       "Low confidence - requires additional verification.")
    }


def identify_red_flags(bias: Dict, verification: Dict) -> list:
    """Identify potential red flags in the content"""
    red_flags = []
    
    sensational_count = bias.get("sensational_count", 0)
    if sensational_count > 3:
        red_flags.append("High use of sensational language")
    
    tone = bias.get("tone", "")
    if tone == "FAKE":
        red_flags.append("AI model flagged content as potentially fake")
    
    disputed = verification.get("disputed", 0)
    confirmed = verification.get("confirmed", 0)
    if disputed > confirmed:
        red_flags.append("More sources dispute than confirm this claim")
    
    if confirmed + disputed == 0:
        red_flags.append("No corroborating sources found")
    
    return red_flags


def get_supporting_evidence(verification: Dict) -> Dict[str, Any]:
    """Get supporting evidence summary"""
    confirmed = verification.get("confirmed", 0)
    disputed = verification.get("disputed", 0)
    
    return {
        "supporting_sources": confirmed,
        "contradicting_sources": disputed,
        "evidence_strength": "Strong" if confirmed >= 3 else "Moderate" if confirmed >= 2 else "Weak",
        "recommendation": "Claim appears well-supported" if confirmed > disputed else 
                         "Claim lacks sufficient support" if confirmed <= disputed else
                         "Mixed evidence - proceed with caution"
    }


def calculate_confidence_score(verification: Dict, bias: Dict) -> float:
    """Calculate overall confidence score (0-1)"""
    confirmed = verification.get("confirmed", 0)
    disputed = verification.get("disputed", 0)
    total_sources = confirmed + disputed
    sensational_count = bias.get("sensational_count", 0)
    
    # Base confidence on source agreement
    if total_sources == 0:
        base_confidence = 0.1
    else:
        agreement_ratio = confirmed / total_sources
        base_confidence = min(0.9, max(0.1, agreement_ratio))
    
    # Adjust for sensational language (reduces confidence)
    sensational_penalty = min(0.3, sensational_count * 0.05)
    
    # Adjust for number of sources (more sources = higher confidence)
    source_bonus = min(0.2, total_sources * 0.02)
    
    final_confidence = max(0.0, min(1.0, base_confidence - sensational_penalty + source_bonus))
    return round(final_confidence, 2)


def generate_recommendations(result: Dict, verification: Dict, bias: Dict) -> list:
    """Generate actionable recommendations"""
    recommendations = []
    
    verdict = result.get("verdict", "")
    confirmed = verification.get("confirmed", 0)
    disputed = verification.get("disputed", 0)
    sensational_count = bias.get("sensational_count", 0)
    
    if verdict == "Likely Fake":
        recommendations.append("⚠️ Exercise extreme caution - this claim appears to be false")
        recommendations.append("🔍 Verify with additional trusted sources before sharing")
    elif verdict == "Uncertain":
        recommendations.append("❓ Claim requires additional verification")
        recommendations.append("📚 Check multiple reputable news sources")
    else:
        recommendations.append("✅ Claim appears to be supported by evidence")
        recommendations.append("📋 Still recommended to verify with primary sources")
    
    if sensational_count > 2:
        recommendations.append("🚩 Content contains sensational language - be skeptical")
    
    if confirmed + disputed < 2:
        recommendations.append("📊 Limited source coverage - seek additional verification")
    
    return recommendations


if __name__ == "__main__":
    example = "Government declared aliens landed in India"
    out = verify_news(example)
    import json

    print(json.dumps(out, indent=2))
