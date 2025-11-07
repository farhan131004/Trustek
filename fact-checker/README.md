# Fact Checker (Baseline)

Pipeline:
- Fetch live articles with NewsAPI (optional).
- Rank source credibility via domain list.
- Cross-verify claim counts.
- NLP bias check (Transformers if available; else heuristic).
- Score and verdict.

## Setup
- Python 3.10+
- `pip install -r requirements.txt`
- Optional: set `NEWS_API_KEY` env var for NewsAPI.

## Run
```
python app.py
```
