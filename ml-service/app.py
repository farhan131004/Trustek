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

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

        # Combine results
        return jsonify({
            'label': fake_news_result.get('label', 'Real'),
            'confidence': fake_news_result.get('confidence', 0.0),
            'source_status': source_status,
            'source_summary': source_summary
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
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
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
        return jsonify({'error': f'Failed to fetch URL: {str(e)}'}), 400
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
        
        return jsonify({
            'label': fake_result['label'],
            'confidence': fake_result['confidence'],
            'extracted_text': text[:300]
        }), 200
        
    except Exception as e:
        logger.error(f"Image analysis error: {str(e)}")
        return jsonify({'error': 'Image analysis failed', 'details': str(e)}), 500


@app.route('/analyze-url', methods=['POST'])
def analyze_from_url():
    """Extract text from website and check credibility"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL field is required'}), 400
        
        logger.info(f"Analyzing URL: {url}")
        
        # Extract text from website
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
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
        
        return jsonify({
            'label': fake_result['label'],
            'confidence': fake_result['confidence'],
            'source_status': scan_result['status'],
            'summary': scan_result['summary'],
            'extracted_text': text[:300]
        }), 200
        
    except requests.exceptions.RequestException as e:
        logger.error(f"URL fetch error: {str(e)}")
        return jsonify({'error': f'Failed to fetch URL: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"URL analysis error: {str(e)}")
        return jsonify({'error': 'URL analysis failed', 'details': str(e)}), 500


if __name__ == '__main__':
    logger.info("🚀 Initializing models...")
    load_fake_news_model()
    load_sentiment_model()
    logger.info("✅ All models loaded successfully")

    logger.info("🌐 Starting Flask server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
