"""
Flask ML Microservice for Fake News Detection, Review Sentiment, and Website Scanning
Uses HuggingFace transformers for text classification
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging
import requests
from bs4 import BeautifulSoup
from PIL import Image
import pytesseract
from io import BytesIO
import os
import re
import json
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
# Configure CORS to allow Spring Boot gateway and frontend
CORS(app, 
     origins=["http://localhost:8081", "http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
ENABLE_HEADLESS = os.getenv('ENABLE_HEADLESS_FETCH', 'false').lower() in ('1', 'true', 'yes')

# Optional LLM client (multi-provider)
try:
    from llm_client import call_llm
except Exception as _e:
    call_llm = None  # graceful fallback

# Read Google CSE credentials once at startup
GOOGLE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_CSE_CX")
if not GOOGLE_API_KEY or not GOOGLE_CX:
    logger.warning("\u26a0\ufe0f Google CSE API key or CX missing — source search disabled.")

# Global variables for models and tokenizers
fake_news_model = None
fake_news_tokenizer = None
sentiment_model = None
sentiment_tokenizer = None
device = None


# ========================
#  MODEL LOADING FUNCTIONS
# ========================

def load_fake_news_model():
    """Load a pre-trained model for fake news detection"""
    global fake_news_model, fake_news_tokenizer, device

    try:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Using device: {device}")

        # Use GPU-enabled model if available, otherwise a smaller CPU model
        if device == 'cuda':
            model_name = "mrm8488/bert-base-uncased-finetuned-fake-news"
            logger.info("Loading bert-base-uncased model with GPU support")
        else:
            # Fallback if fake-news model is not available
            model_name = "distilbert-base-uncased-finetuned-sst-2-english"
            logger.info("Loading lightweight model for CPU")

        logger.info(f"Loading fake news model: {model_name}")
        fake_news_tokenizer = AutoTokenizer.from_pretrained(model_name)
        fake_news_model = AutoModelForSequenceClassification.from_pretrained(model_name)
        fake_news_model.to(device)
        fake_news_model.eval()

        logger.info("✅ Fake news model loaded successfully")

    except Exception as e:
        logger.error(f"❌ Error loading fake news model: {str(e)}")
        raise


def load_sentiment_model():
    """Load a pre-trained model for review sentiment analysis"""
    global sentiment_model, sentiment_tokenizer

    try:
        if device == 'cuda':
            model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
        else:
            model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"

        logger.info(f"Loading sentiment model: {model_name}")
        sentiment_tokenizer = AutoTokenizer.from_pretrained(model_name)
        sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_name)
        sentiment_model.to(device)
        sentiment_model.eval()

        logger.info("✅ Sentiment model loaded successfully")

    except Exception as e:
        logger.error(f"❌ Error loading sentiment model: {str(e)}")
        raise


# ========================
#       API ROUTES
# ========================

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check"""
    return jsonify({
        'status': 'healthy',
        'fake_news_model_loaded': fake_news_model is not None,
        'sentiment_model_loaded': sentiment_model is not None,
        'device': device
    }), 200


@app.route('/fake-news', methods=['POST'])
def analyze_fake_news():
    """Fake news detection API"""
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'Invalid request. "text" field is required.'}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400

        logger.info(f"Analyzing fake news text (len={len(text)})")

        inputs = fake_news_tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512, padding=True
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = fake_news_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

        confidence = predictions[0].max().item()
        predicted_class = predictions[0].argmax().item()

        # Generic mapping
        label = "Fake" if predicted_class == 1 else "Real"

        return jsonify({
            'label': label,
            'confidence': round(confidence, 4)
        }), 200

    except Exception as e:
        logger.error(f"Error in fake news analysis: {str(e)}")
        return jsonify({'error': 'Analysis failed', 'details': str(e)}), 500


@app.route('/review', methods=['POST'])
def analyze_review():
    """Sentiment analysis API"""
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'Invalid request. "text" field is required.'}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400

        logger.info(f"Analyzing review sentiment (len={len(text)})")

        inputs = sentiment_tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512, padding=True
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = sentiment_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

        confidence = predictions[0].max().item()
        predicted_class = predictions[0].argmax().item()

        # For roberta: 0=Negative, 1=Neutral, 2=Positive
        sentiment = "Positive" if predicted_class == 2 else "Negative"

        return jsonify({
            'sentiment': sentiment,
            'confidence': round(confidence, 4)
        }), 200

    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return jsonify({'error': 'Sentiment analysis failed', 'details': str(e)}), 500


@app.route('/scan', methods=['POST'])
def scan_website():
    """Basic website safety scanner"""
    try:
        data = request.get_json()

        if not data or 'url' not in data:
            return jsonify({'error': 'Invalid request. "url" field is required.'}), 400

        url = data['url'].strip()
        if not url:
            return jsonify({'error': 'URL cannot be empty'}), 400

        logger.info(f"Scanning website: {url}")

        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        text_content = soup.get_text()[:1000].lower()

        suspicious_keywords = [
            'phishing', 'scam', 'malware', 'virus', 'free money',
            'click here', 'urgent', 'verify now', 'password expired'
        ]

        suspicious_count = sum(1 for k in suspicious_keywords if k in text_content)

        if suspicious_count >= 2:
            status = "Suspicious"
            summary = f"Website contains {suspicious_count} suspicious keywords."
        else:
            status = "Safe"
            summary = "Website appears safe."

        return jsonify({
            'status': status,
            'summary': summary,
            'suspicious_keywords_found': suspicious_count
        }), 200

    except requests.exceptions.RequestException as e:
        logger.error(f"Website fetch error: {str(e)}")
        return jsonify({
            'status': 'Suspicious',
            'summary': f"Unable to fetch website. Error: {str(e)}"
        }), 200
    except Exception as e:
        logger.error(f"Website scan error: {str(e)}")
        return jsonify({'error': 'Website scan failed', 'details': str(e)}), 500


@app.route('/analyze-news', methods=['POST'])
def analyze_news_unified():
    """Unified endpoint for fake news detection + source verification"""
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'Invalid request. "text" field is required.'}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400

        url = data.get('url', '').strip() if 'url' in data else ''

        logger.info(f"Unified analysis: text (len={len(text)}), url={url if url else 'None'}")

        # 1. Fake news detection
        try:
            inputs = fake_news_tokenizer(
                text, return_tensors="pt", truncation=True, max_length=512, padding=True
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = fake_news_model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

            confidence = predictions[0].max().item()
            predicted_class = predictions[0].argmax().item()
            label = "Fake" if predicted_class == 1 else "Real"

            fake_news_result = {
                'label': label,
                'confidence': round(confidence, 4)
            }
        except Exception as e:
            logger.error(f"Fake news analysis error: {str(e)}")
            fake_news_result = {
                'label': 'Real',
                'confidence': 0.0,
                'error': f"Fake news analysis failed: {str(e)}"
            }

        # 2. Source verification (if URL provided)
        source_status = "Unverified"
        source_summary = "No source URL provided"

        if url:
            try:
                logger.info(f"Verifying source URL: {url}")
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, 'html.parser')
                text_content = soup.get_text()[:1000].lower()

                suspicious_keywords = [
                    'phishing', 'scam', 'malware', 'virus', 'free money',
                    'click here', 'urgent', 'verify now', 'password expired'
                ]

                suspicious_count = sum(1 for k in suspicious_keywords if k in text_content)

                if suspicious_count >= 2:
                    source_status = "Suspicious"
                    source_summary = f"Website contains {suspicious_count} suspicious keywords."
                else:
                    source_status = "Safe"
                    source_summary = "Website appears safe."

            except requests.exceptions.RequestException as e:
                logger.error(f"Source verification error: {str(e)}")
                source_status = "Suspicious"
                source_summary = f"Unable to fetch website. Error: {str(e)}"
            except Exception as e:
                logger.error(f"Source scan error: {str(e)}")
                source_status = "Suspicious"
                source_summary = f"Source verification failed: {str(e)}"

        # 3. Retrieve corroborating sources via Google CSE (if configured)
        # Use the input text as the query; truncate to keep it concise
        # Build keywords from the analyzed text and use them to rank sources
        keywords = extract_keywords(text, max_terms=12)
        query_text = ' '.join(keywords)[:256] or text[:256]
        sources = search_sources(query_text, max_results=5, keywords=keywords)

        # Combine results
        return jsonify({
            'label': fake_news_result.get('label', 'Real'),
            'confidence': fake_news_result.get('confidence', 0.0),
            'source_status': source_status,
            'source_summary': source_summary,
            'sources': sources
        }), 200

    except Exception as e:
        logger.error(f"Unified news analysis error: {str(e)}")
        return jsonify({
            'error': 'Analysis failed',
            'details': str(e)
        }), 500


# ========================
#       HELPER FUNCTIONS
# ========================

def analyze_fake_news_internal(text):
    """Internal helper function to analyze text for fake news"""
    try:
        inputs = fake_news_tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512, padding=True
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = fake_news_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

        confidence = predictions[0].max().item()
        predicted_class = predictions[0].argmax().item()
        label = "Fake" if predicted_class == 1 else "Real"

        return {
            'label': label,
            'confidence': round(confidence, 4)
        }
    except Exception as e:
        logger.error(f"Fake news analysis error: {str(e)}")
        return {
            'label': 'Real',
            'confidence': 0.0
        }


def scan_website_internal(url):
    """Internal helper function to scan website for credibility"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        text_content = soup.get_text()[:1000].lower()

        suspicious_keywords = [
            'phishing', 'scam', 'malware', 'virus', 'free money',
            'click here', 'urgent', 'verify now', 'password expired'
        ]

        suspicious_count = sum(1 for k in suspicious_keywords if k in text_content)

        if suspicious_count >= 2:
            status = "Suspicious"
            summary = f"Website contains {suspicious_count} suspicious keywords."
        else:
            status = "Safe"
            summary = "Website appears safe."

        return {
            'status': status,
            'summary': summary
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Website fetch error: {str(e)}")
        return {
            'status': 'Suspicious',
            'summary': f"Unable to fetch website. Error: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Website scan error: {str(e)}")
        return {
            'status': 'Suspicious',
            'summary': f"Website scan failed: {str(e)}"
        }


def search_sources(query: str, max_results: int = 5, keywords=None):
    """Search corroborating sources using Google Custom Search API.
    Requires env vars GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX.
    Returns a list of {title, url, snippet, source}.
    If keys are missing or request fails, returns [].
    """
    try:
        api_key = GOOGLE_API_KEY
        cx = GOOGLE_CX
        if not api_key or not cx or not query:
            logger.warning("Source search unavailable: missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX or empty query.")
            return []

        params = {
            'key': api_key,
            'cx': cx,
            'q': query,
            'num': min(max_results, 10)
        }
        resp = requests.get('https://www.googleapis.com/customsearch/v1', params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])

        # Prepare keyword set for ranking
        kw_set = set([k.lower() for k in (keywords or []) if k])

        ranked = []
        for it in items:
            link = it.get('link') or it.get('formattedUrl')
            title = it.get('title')
            snippet = it.get('snippet')
            # Derive simple domain as source
            source = ''
            if link:
                try:
                    from urllib.parse import urlparse
                    source = urlparse(link).netloc
                except Exception:
                    source = ''
            # Score by keyword overlap in title + snippet
            text_blob = f"{title or ''} {snippet or ''}".lower()
            words = set(re.findall(r"[a-zA-Z][a-zA-Z\-']+", text_blob))
            overlap = len(kw_set.intersection(words)) if kw_set else 0
            ranked.append((overlap, {
                'title': title,
                'url': link,
                'snippet': snippet,
                'source': source
            }))
        # Sort by overlap desc, keep top max_results
        ranked.sort(key=lambda x: x[0], reverse=True)
        return [entry for _, entry in ranked[:max_results]]
    except Exception as e:
        logger.warning(f"Source search failed or unavailable: {str(e)}")
        return []


def extract_keywords(text: str, max_terms: int = 12):
    """Extract simple keywords from text: lowercase, strip punctuation, remove stopwords,
    keep words length>2, and return top unique terms by frequency order.
    """
    if not text:
        return []
    text = text.lower()
    tokens = re.findall(r"[a-zA-Z][a-zA-Z\-']+", text)
    stopwords = {
        'the','a','an','and','or','but','if','then','else','when','while','of','on','in','to','for','with','by','from','about','as','at','it','its','is','are','was','were','be','been','being','this','that','those','these','you','your','we','they','their','our','i','he','she','him','her','them','my','me','us','do','does','did','done','just','before','after','over','under','between','into','out','up','down','more','most','less','least','very','also','not','no','yes','any','some','such','than','so','too','can','will','would','could','should','may','might','have','has','had','what','which','who','whom','whose','been','because','how','why','where','when','there','here','news','top','breaking','update','rumors','rumor'
    }
    freq = {}
    ordered = []
    for t in tokens:
        if len(t) <= 2:
            continue
        if t in stopwords:
            continue
        if t not in freq:
            ordered.append(t)
            freq[t] = 0
        freq[t] += 1
    # Sort by frequency while preserving first-seen order
    # Avoid using ordered.index(w) inside sort key (can cause ValueError edge cases)
    positions = {w: i for i, w in enumerate(ordered)}
    ordered.sort(key=lambda w: (-freq[w], positions.get(w, 0)))
    return ordered[:max_terms]


def robust_fetch(url: str, timeout: int = 12):
    """Try fetching a URL with increasing permissiveness to bypass simple WAFs.
    Returns (response, content_text). Raises last exception if all attempts fail.
    """
    headers_list = [
        # Desktop Chrome with referer/language
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        },
        # Googlebot fallback
        {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        },
    ]
    last_exc = None
    for headers in headers_list:
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            # Some sites send 200 with access denied HTML through WAF; treat as failure
            text = resp.text or ''
            lowered = text.lower()
            if resp.status_code in (401, 403) or ('access denied' in lowered and 'permission' in lowered):
                last_exc = requests.exceptions.RequestException(f"Access denied (status={resp.status_code}).")
                continue
            resp.raise_for_status()
            return resp, text
        except requests.exceptions.RequestException as e:
            last_exc = e
            continue
    if last_exc:
        # Optional headless fallback
        if ENABLE_HEADLESS:
            try:
                html = headless_fetch(url, timeout=timeout)
                if html and html.strip():
                    # Build a minimal response-like object with text
                    class R:  # lightweight struct
                        status_code = 200
                        text = html
                    return R(), html
            except Exception as e:
                logger.warning(f"Headless fetch failed: {e}")
        raise last_exc
    raise requests.exceptions.RequestException('Unknown fetch failure')


def headless_fetch(url: str, timeout: int = 12) -> str:
    """Use undetected-chromedriver (Selenium) to fetch fully rendered HTML.
    Controlled by ENABLE_HEADLESS_FETCH env var. Requires Chrome/Chromium installed.
    Returns page_source string.
    """
    # Lazy imports to avoid mandatory dependency at startup
    import importlib
    uc = importlib.import_module('undetected_chromedriver')
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    options = uc.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--lang=en-US')
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36')

    driver = uc.Chrome(options=options)
    try:
        driver.set_page_load_timeout(timeout)
        driver.get(url)
        # Wait for body to be present
        WebDriverWait(driver, min(timeout, 12)).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
        html = driver.page_source
        # Basic access-denied filtering
        lowered = (html or '').lower()
        if 'access denied' in lowered and 'permission' in lowered:
            raise requests.exceptions.RequestException('Access denied (headless)')
        return html
    finally:
        try:
            driver.quit()
        except Exception:
            pass


# ========================
#  LLM/HYBRID HELPER UTILS
# ========================

def _load_prompt_text() -> str:
    """Load the Windsurf/Grok prompt file saved in the frontend repo.
    Falls back to a minimal system prompt if not found.
    """
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Frontend prompt path (relative): ../trustek-app--master/src/config/credibilityPrompt.json
        prompt_path = os.path.normpath(os.path.join(base_dir, '..', 'trustek-app--master', 'src', 'config', 'credibilityPrompt.json'))
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # prefer data.get('system') or a string field named 'prompt'
            if isinstance(data, dict):
                for key in ('system', 'prompt', 'content', 'text'):
                    if key in data and isinstance(data[key], str) and data[key].strip():
                        return data[key]
            # If file exists but not structured, read raw text
            with open(prompt_path, 'r', encoding='utf-8') as f2:
                return f2.read()
    except Exception as e:
        logger.warning(f"Prompt load failed: {e}")
    return (
        "You are Trustek AI Credibility Engine. Return ONLY valid JSON matching the schema: "
        "{ 'verdict': 'REAL|MIXED|LIKELY_FAKE|UNVERIFIED', 'credibility_score': number, 'confidence': number, "
        "'claims': [ {'id': number, 'claim': string, 'judgement': 'Supported|Unverified|Contradicted', 'sources': [{'url': string, 'snippet': string}]} ], "
        "'reasoning': [string] }. No extra text."
    )


def _normalize_schema(obj: dict) -> dict:
    """Ensure response matches the unified schema with safe defaults."""
    out = {
        'verdict': obj.get('verdict') if obj.get('verdict') in ('REAL', 'MIXED', 'LIKELY_FAKE', 'UNVERIFIED') else 'UNVERIFIED',
        'credibility_score': int(obj.get('credibility_score') or 0),
        'confidence': float(obj.get('confidence') or 0.0),
        'claims': [],
        'reasoning': obj.get('reasoning') if isinstance(obj.get('reasoning'), list) else []
    }
    claims = obj.get('claims') if isinstance(obj.get('claims'), list) else []
    norm_claims = []
    for i, c in enumerate(claims, start=1):
        if not isinstance(c, dict):
            continue
        judgement = c.get('judgement')
        if judgement not in ('Supported', 'Unverified', 'Contradicted'):
            judgement = 'Unverified'
        sources = c.get('sources') if isinstance(c.get('sources'), list) else []
        norm_sources = []
        for s in sources:
            if isinstance(s, dict):
                norm_sources.append({
                    'url': (s.get('url') or '')[:512],
                    'snippet': (s.get('snippet') or (s.get('title') or ''))[:500]
                })
        norm_claims.append({
            'id': int(c.get('id') or i),
            'claim': (c.get('claim') or '')[:600],
            'judgement': judgement,
            'sources': norm_sources
        })
    out['claims'] = norm_claims
    # Clamp ranges
    out['credibility_score'] = max(0, min(100, out['credibility_score']))
    out['confidence'] = max(0.0, min(1.0, out['confidence']))
    return out


@app.route('/extract-text-from-image', methods=['POST'])
def extract_text_from_image():
    """Extract text from uploaded image using OCR"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.content_type.startswith('image/'):
            return jsonify({'error': 'File must be an image'}), 400
        
        logger.info(f"Extracting text from image: {file.filename}")
        
        # Read image
        image = Image.open(file.stream)
        text = pytesseract.image_to_string(image)
        
        if not text.strip():
            return jsonify({
                'text': '',
                'message': 'No text found in image'
            }), 200
        
        logger.info(f"Extracted text (len={len(text)})")
        
        return jsonify({
            'text': text.strip()
        }), 200
        
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        return jsonify({'error': 'OCR failed', 'details': str(e)}), 500


@app.route('/extract-text-from-url', methods=['POST'])
def extract_text_from_url():
    """Extract main text content from a webpage URL"""
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({'error': 'Invalid request. "url" field is required.'}), 400
        
        url = data['url'].strip()
        if not url:
            return jsonify({'error': 'URL cannot be empty'}), 400
        
        logger.info(f"Extracting text from URL: {url}")
        
        # Robust fetch with WAF-friendly headers
        response, raw_text = robust_fetch(url, timeout=12)
        soup = BeautifulSoup(raw_text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Limit to first 2000 characters for analysis
        extracted_text = text[:2000] if len(text) > 2000 else text
        
        if not extracted_text.strip():
            return jsonify({
                'text': '',
                'message': 'No readable text found on webpage'
            }), 200
        
        logger.info(f"Extracted text from URL (len={len(extracted_text)})")
        
        return jsonify({
            'text': extracted_text.strip()
        }), 200
        
    except requests.exceptions.RequestException as e:
        logger.error(f"URL fetch error: {str(e)}")
        return jsonify({'error': f'Failed to fetch URL: {str(e)}', 'code': 'ACCESS_DENIED'}), 400
    except Exception as e:
        logger.error(f"Text extraction error: {str(e)}")
        return jsonify({'error': 'Text extraction failed', 'details': str(e)}), 500


@app.route('/analyze-image', methods=['POST'])
def analyze_from_image():
    """Extract text from image (OCR) and check if it's fake"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image = Image.open(request.files['file'].stream)
        text = pytesseract.image_to_string(image)
        
        if not text.strip():
            return jsonify({
                'label': 'Real',
                'confidence': 0.0,
                'extracted_text': ''
            }), 200
        
        logger.info(f"Extracted text from image (len={len(text)}), analyzing...")
        
        fake_result = analyze_fake_news_internal(text)
        
        # Retrieve corroborating sources using extracted text
        query_text = text[:256]
        sources = search_sources(query_text, max_results=5)

        return jsonify({
            'label': fake_result['label'],
            'confidence': fake_result['confidence'],
            'extracted_text': text[:300],
            'sources': sources
        }), 200
        
    except Exception as e:
        logger.error(f"Image analysis error: {str(e)}")
        return jsonify({'error': 'Image analysis failed', 'details': str(e)}), 500


@app.route('/fact-check', methods=['POST'])
def fact_check():
    """Fact-check endpoint - alias for analyze-url for compatibility"""
    return analyze_from_url()

@app.route('/analyze-url', methods=['POST'])
def analyze_from_url():
    """Extract text from website and check credibility"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL field is required'}), 400
        
        logger.info(f"Analyzing URL: {url}")
        
        # Extract text from website with robust fetch (handles WAF/denials)
        try:
            response, raw_text = robust_fetch(url, timeout=12)
        except requests.exceptions.RequestException as e:
            logger.error(f"URL fetch error: {str(e)}")
            return jsonify({'error': f'Failed to fetch URL: {str(e)}', 'code': 'ACCESS_DENIED'}), 400

        soup = BeautifulSoup(raw_text, 'html.parser')
        text = soup.get_text()[:2000]
        
        if not text.strip():
            return jsonify({
                'label': 'Real',
                'confidence': 0.0,
                'source_status': 'Suspicious',
                'summary': 'No readable text found on webpage',
                'extracted_text': ''
            }), 200
        
        logger.info(f"Extracted text (len={len(text)}), analyzing...")
        
        # Analyze for fake news
        fake_result = analyze_fake_news_internal(text)

        # Scan website for credibility
        scan_result = scan_website_internal(url)

        # Retrieve corroborating sources
        # Prefer page title if available; fallback to extracted text
        page_title = soup.title.string.strip() if soup.title and soup.title.string else ''
        keywords = extract_keywords((page_title + ' ' + text) if page_title else text, max_terms=12)
        query_text = (' '.join(keywords)[:256]) or (page_title or text[:256])
        sources = search_sources(query_text, max_results=5, keywords=keywords)

        return jsonify({
            'label': fake_result['label'],
            'confidence': fake_result['confidence'],
            'source_status': scan_result['status'],
            'summary': scan_result['summary'],
            'extracted_text': text[:300],
            'sources': sources
        }), 200
        
    except requests.exceptions.RequestException as e:
        logger.error(f"URL fetch error: {str(e)}")
        return jsonify({'error': f'Failed to fetch URL: {str(e)}', 'code': 'ACCESS_DENIED'}), 400
    except Exception as e:
        logger.error(f"URL analysis error: {str(e)}")
        return jsonify({'error': 'URL analysis failed', 'details': str(e)}), 500


@app.route('/analyze-structured', methods=['POST'])
def analyze_structured():
    """Return a structured JSON verdict for an article. Input: {text?: str, url?: str}
    Output schema:
    {
      "verdict": "REAL | MIXED | LIKELY_FAKE | UNVERIFIED",
      "credibility_score": 0-100,
      "confidence": 0.0-1.0,
      "claims": [ {"id": n, "claim": str, "judgement": "Supported | Unverified | Contradicted", "sources": [{"url":"...","snippet":"..."}] } ],
      "reasoning": [str, ...]
    }
    """
    try:
        data = request.get_json() or {}
        raw_text = data.get('text', '') or ''
        in_url = data.get('url', '') or ''

        # If URL provided, fetch and extract text
        if not raw_text and in_url:
            try:
                _, html = robust_fetch(in_url, timeout=12)
                soup = BeautifulSoup(html, 'html.parser')
                for s in soup(['script', 'style']):
                    s.decompose()
                raw_text = soup.get_text(separator=' ')
            except Exception as e:
                return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Unable to fetch article: {str(e)}']}), 200

        text = (raw_text or '').strip()
        if not text:
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['No content provided']}), 200

        # Limit size
        text = text[:4000]

        # Extract claims: simple sentence split, pick factual-looking sentences
        sentences = re.split(r"(?<=[.!?])\s+", text)
        claim_candidates = [s.strip() for s in sentences if len(s.strip()) > 20]
        claims = []
        cid = 1
        for s in claim_candidates:
            claims.append({'id': cid, 'claim': s})
            cid += 1
            if len(claims) >= 6:
                break

        if not claims:
            claims = [{'id': 1, 'claim': text[:180]}]

        # For overall confidence, reuse fake-news classifier
        fn = analyze_fake_news_internal(text[:1000])
        overall_conf = float(fn.get('confidence', 0.0))

        # For each claim, search corroboration
        structured_claims = []
        supported_count = 0
        contrad_count = 0
        for c in claims:
            ctext = c['claim'][:256]
            kws = extract_keywords(ctext, max_terms=8)
            results = search_sources(' '.join(kws)[:256] or ctext, max_results=4, keywords=kws)
            # Heuristic: if we have >=2 sources, treat as Supported; if title/snippet contains negation phrases vs keywords -> Contradicted
            judgement = 'Unverified'
            if len(results) >= 2:
                judgement = 'Supported'
                supported_count += 1
            else:
                # look for negation words
                neg_words = {'fake', 'false', 'debunked', 'not true', 'hoax'}
                hay = ' '.join([(r.get('title') or '') + ' ' + (r.get('snippet') or '') for r in results]).lower()
                if any(nw in hay for nw in neg_words):
                    judgement = 'Contradicted'
                    contrad_count += 1

            structured_claims.append({
                'id': c['id'],
                'claim': c['claim'],
                'judgement': judgement,
                'sources': [{'url': r.get('url') or '', 'snippet': r.get('snippet') or (r.get('title') or '')} for r in results]
            })

        total = max(1, len(structured_claims))
        credibility_score = int(round((supported_count / total) * 100))
        # adjust using fake-news classifier prior
        if fn.get('label') == 'Fake':
            credibility_score = min(credibility_score, 40)
        elif fn.get('label') == 'Real':
            credibility_score = max(credibility_score, 60)

        if credibility_score >= 70:
            verdict = 'REAL'
        elif credibility_score >= 45:
            verdict = 'MIXED'
        elif contrad_count > 0 or fn.get('label') == 'Fake':
            verdict = 'LIKELY_FAKE'
        else:
            verdict = 'UNVERIFIED'

        reasoning = []
        if supported_count >= 1:
            reasoning.append('At least one claim is supported by multiple reputable sources.')
        if contrad_count >= 1:
            reasoning.append('One or more claims appear to be contradicted by reputable sources.')
        if all(len(sc['sources']) == 0 for sc in structured_claims):
            reasoning.append('Insufficient corroboration found via web search.')
        if not reasoning:
            reasoning.append('Evidence is mixed or limited; further review recommended.')

        return jsonify({
            'verdict': verdict,
            'credibility_score': credibility_score,
            'confidence': round(overall_conf, 3),
            'claims': structured_claims,
            'reasoning': reasoning
        }), 200

    except Exception as e:
        logger.error(f"Structured analysis error: {str(e)}")
        return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Error: {str(e)}']}), 200


@app.route('/analyze-llm', methods=['POST'])
def analyze_llm():
    """LLM-only pipeline. Returns unified schema. Fallback to rule-based if LLM unavailable."""
    try:
        data = request.get_json() or {}
        text = (data.get('text') or '').strip()
        in_url = (data.get('url') or '').strip()
        # Fetch text if only URL provided
        if not text and in_url:
            try:
                _, html = robust_fetch(in_url, timeout=12)
                soup = BeautifulSoup(html, 'html.parser')
                for s in soup(['script', 'style']):
                    s.decompose()
                text = soup.get_text(separator=' ')
            except Exception as e:
                return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Unable to fetch article: {str(e)}']}), 200
        if not text:
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['No content provided']}), 200

        # If LLM is not wired, fallback to structured
        if call_llm is None:
            logger.warning("LLM client unavailable; falling back to structured analysis.")
            request.json.update({'text': text, 'url': in_url}) if hasattr(request, 'json') else None
            return analyze_structured()

        # Build prompt: system template + article content
        system_prompt = _load_prompt_text()
        prompt = f"{system_prompt}\n\nARTICLE:\n{text[:12000]}\n\nReturn ONLY JSON."

        json_text, provider_used = call_llm(prompt)
        if not json_text:
            logger.warning(f"LLM returned no content; provider info: {provider_used}")
            request.json.update({'text': text, 'url': in_url}) if hasattr(request, 'json') else None
            return analyze_structured()

        try:
            raw = json.loads(json_text)
            if isinstance(raw, str):
                # Some providers may nest a JSON string
                raw = json.loads(raw)
        except Exception as e:
            logger.warning(f"LLM JSON parse failed: {e}")
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['LLM output not valid JSON']}), 200

        if not isinstance(raw, dict):
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['LLM output not an object']}), 200

        out = _normalize_schema(raw)
        return jsonify(out), 200
    except Exception as e:
        logger.error(f"LLM analysis error: {str(e)}")
        return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Error: {str(e)}']}), 200


@app.route('/analyze-hybrid', methods=['POST'])
def analyze_hybrid():
    """Hybrid pipeline: LLM claim extraction + Google CSE verification + verdict recompute."""
    try:
        data = request.get_json() or {}
        text = (data.get('text') or '').strip()
        in_url = (data.get('url') or '').strip()
        # Fetch text if only URL provided
        if not text and in_url:
            try:
                _, html = robust_fetch(in_url, timeout=12)
                soup = BeautifulSoup(html, 'html.parser')
                for s in soup(['script', 'style']):
                    s.decompose()
                text = soup.get_text(separator=' ')
            except Exception as e:
                return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Unable to fetch article: {str(e)}']}), 200
        if not text:
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['No content provided']}), 200

        # If LLM is not wired, fallback to structured
        if call_llm is None:
            logger.warning("LLM client unavailable; falling back to structured analysis.")
            request.json.update({'text': text, 'url': in_url}) if hasattr(request, 'json') else None
            return analyze_structured()

        # Step A: LLM extraction
        system_prompt = _load_prompt_text()
        prompt = f"{system_prompt}\n\nARTICLE:\n{text[:12000]}\n\nReturn ONLY JSON."
        json_text, provider_used = call_llm(prompt)
        if not json_text:
            logger.warning(f"LLM returned no content (hybrid); provider info: {provider_used}")
            request.json.update({'text': text, 'url': in_url}) if hasattr(request, 'json') else None
            return analyze_structured()

        try:
            raw = json.loads(json_text)
            if isinstance(raw, str):
                raw = json.loads(raw)
        except Exception as e:
            logger.warning(f"LLM JSON parse failed (hybrid): {e}")
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['LLM output not valid JSON']}), 200
        if not isinstance(raw, dict):
            return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': ['LLM output not an object']}), 200

        report = _normalize_schema(raw)

        # Step B: Cross-check each claim via Google CSE
        supported_count = 0
        contrad_count = 0
        new_claims = []
        for c in report.get('claims', []):
            ctext = (c.get('claim') or '')[:256]
            kws = extract_keywords(ctext, max_terms=8)
            results = search_sources(' '.join(kws)[:256] or ctext, max_results=4, keywords=kws)

            judgement = 'Unverified'
            if len(results) >= 2:
                judgement = 'Supported'
                supported_count += 1
            else:
                neg_words = {'fake', 'false', 'debunked', 'not true', 'hoax'}
                hay = ' '.join([(r.get('title') or '') + ' ' + (r.get('snippet') or '') for r in results]).lower()
                if any(nw in hay for nw in neg_words):
                    judgement = 'Contradicted'
                    contrad_count += 1

            new_claims.append({
                'id': int(c.get('id') or 0) or (len(new_claims) + 1),
                'claim': ctext,
                'judgement': judgement,
                'sources': [{'url': r.get('url') or '', 'snippet': r.get('snippet') or (r.get('title') or '')} for r in results]
            })

        total = max(1, len(new_claims))
        credibility_score = int(round((supported_count / total) * 100))
        # Verdict rules similar to structured
        if credibility_score >= 70:
            verdict = 'REAL'
        elif credibility_score >= 45:
            verdict = 'MIXED'
        elif contrad_count > 0:
            verdict = 'LIKELY_FAKE'
        else:
            verdict = 'UNVERIFIED'

        confidence = round(max(0.0, min(1.0, credibility_score / 100.0)), 3)

        final = {
            'verdict': verdict,
            'credibility_score': credibility_score,
            'confidence': confidence,
            'claims': new_claims,
            'reasoning': report.get('reasoning', []) or ['Hybrid verification applied: claims extracted by LLM and corroborated via web search.']
        }
        return jsonify(final), 200
    except Exception as e:
        logger.error(f"Hybrid analysis error: {str(e)}")
        return jsonify({'verdict': 'UNVERIFIED', 'credibility_score': 0, 'confidence': 0.0, 'claims': [], 'reasoning': [f'Error: {str(e)}']}), 200

if __name__ == '__main__':
    logger.info("🚀 Initializing models...")
    load_fake_news_model()
    load_sentiment_model()
    logger.info("✅ All models loaded successfully")

    logger.info("🌐 Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
