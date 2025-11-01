# Trustek ML Service - Python Flask

This is the Flask microservice for fake news detection using HuggingFace transformers.

## 📋 Prerequisites

- **Python 3.9+**
- **pip** or **conda**
- **8GB+ RAM** (recommended for model loading)

## 🚀 Quick Start

### Option 1: Using pip

```bash
# Navigate to ml-service directory
cd ml-service

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

### Option 2: Using conda

```bash
# Create conda environment
conda create -n trustek-ml python=3.9

# Activate environment
conda activate trustek-ml

# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

The service will start on **http://localhost:8000**

## 🧠 Model Information

The service uses pre-trained BERT models from HuggingFace:

- **CPU**: `mrm8488/bert-tiny-finetuned-fake-news` (lightweight)
- **GPU**: `mrm8488/bert-base-uncased-finetuned-fake-news` (higher accuracy)

The model automatically selects the appropriate version based on available hardware.

## 📡 API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda"
}
```

### Analyze Fake News
```http
POST /analyze
Content-Type: application/json

{
  "text": "Your news article text here..."
}
```

**Response:**
```json
{
  "verdict": "FAKE",
  "confidence": 0.92
}
```

**Verdict values:**
- `REAL`: The text is likely real/genuine news
- `FAKE`: The text is likely fake news

## 🧪 Testing with cURL

```bash
# Health check
curl http://localhost:8000/health

# Analyze text
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Breaking news: Scientists discover unicorns exist!"}'
```

## 🧪 Testing with Python

```python
import requests

# Health check
response = requests.get('http://localhost:8000/health')
print(response.json())

# Analyze text
data = {
    "text": "Scientists have discovered a new species of marine life in the depths of the Pacific Ocean."
}
response = requests.post('http://localhost:8000/analyze', json=data)
print(response.json())
```

## 🔧 Configuration

Key configuration in `app.py`:

```python
# Server configuration
app.run(
    host='0.0.0.0',  # Listen on all interfaces
    port=8000,       # Port number
    debug=False      # Set to True for development
)
```

## 📦 Dependencies

- **flask**: Web framework
- **flask-cors**: CORS support for cross-origin requests
- **torch**: PyTorch for model execution
- **transformers**: HuggingFace transformers library
- **sentencepiece**: Text tokenization
- **protobuf**: Protocol buffer support
- **scipy & numpy**: Scientific computing

## 🖥️ GPU Support

If you have a CUDA-enabled GPU, the service will automatically:
1. Detect GPU availability
2. Load the larger, more accurate model
3. Perform inference on GPU for faster processing

To check GPU availability:
```python
import torch
print(torch.cuda.is_available())
```

## 🐛 Troubleshooting

### Model Download Issues
If the model fails to download:
```bash
# Set HuggingFace cache directory
export HF_HOME=/path/to/cache
# Or on Windows:
set HF_HOME=C:\path\to\cache
```

### Out of Memory
- The service uses approximately 2-4GB RAM (CPU) or 4-8GB VRAM (GPU)
- If running out of memory, ensure you have enough free space
- Consider using the tiny model for low-resource systems

### Port Already in Use
Change the port in `app.py`:
```python
app.run(host='0.0.0.0', port=8001)  # Use port 8001
```

### Slow Loading on First Run
- First run downloads the model (500MB-1GB)
- Subsequent runs will be faster as the model is cached

## 📝 Notes

- The model is loaded once on startup and reused for all requests
- Text is truncated to 512 tokens (BERT's maximum)
- Confidence scores range from 0.5 to 1.0
- The service is stateless and horizontally scalable

