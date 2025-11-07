import os
import sys
import pytest

HERE = os.path.dirname(__file__)
FACTCHECKER_DIR = os.path.abspath(os.path.join(HERE, "..", "fact-checker"))
if FACTCHECKER_DIR not in sys.path:
    sys.path.append(FACTCHECKER_DIR)

from credibility_score import get_source_rank  # noqa: E402


@pytest.mark.parametrize(
    "url",
    [
        "https://www.reuters.com/markets/us/",
        "https://apnews.com/article/...",
        "https://www.bbc.com/news/world-asia-...",
        "https://www.nytimes.com/2024/11/03/...",
        "https://www.washingtonpost.com/politics/...",
        "https://www.theguardian.com/world/...",
        "https://www.nature.com/articles/...",
        "https://www.sciencedirect.com/science/article/pii/...",
        "https://www.aljazeera.com/news/...",
        "https://www.economist.com/briefing/...",
        "https://www.indiatoday.in/...",
        "https://www.thehindu.com/news/...",
        "https://indianexpress.com/article/...",
        "https://timesofindia.indiatimes.com/india/...",
        "https://www.livemint.com/news/...",
        "https://www.business-standard.com/industry/...",
        "https://scroll.in/latest/...",
        "https://www.moneycontrol.com/news/...",
        "https://www.hindustantimes.com/india-news/...",
        "https://www.livehindustan.com/national/...",
    ],
)
def test_high_rank(url):
    assert get_source_rank(url) == 3


@pytest.mark.parametrize("url", [
    "https://edition.cnn.com/2024/11/03/...",
    "https://www.foxnews.com/politics/...",
])
def test_medium_rank(url):
    assert get_source_rank(url) == 2


@pytest.mark.parametrize("url", [
    "https://random.blogspot.com/post",
    "https://www.reddit.com/r/news/comments/...",
    "https://unknown-example-site.xyz/article",
])
def test_low_rank(url):
    assert get_source_rank(url) == 1
