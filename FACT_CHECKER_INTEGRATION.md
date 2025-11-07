# Trustek Fact-Checker Integration Guide

## Overview
This guide explains how to run the enhanced fact-checking system that connects your Python fact-checker with the Java Spring Boot backend.

## Architecture
```
Frontend (React) → Java Backend (Spring Boot) → Python Fact-Checker (FastAPI)
                                              ↓
                                         NewsAPI + ML Models
```

## Prerequisites

### Python Dependencies
```bash
pip install fastapi uvicorn pydantic requests tldextract python-dotenv transformers torch
```

### Java Dependencies
- Spring Boot with RestTemplate
- Jackson for JSON processing

### API Keys
- NewsAPI key from https://newsapi.org (optional but recommended)

## Setup Instructions

### 1. Configure Environment Variables

#### Option A: Environment Variables (Windows)
```powershell
# Set NewsAPI key
$env:NEWS_API_KEY = "your_newsapi_key_here"
```

#### Option B: .env File (Recommended)
Create `.env` in the `fact-checker` folder:
```
NEWS_API_KEY=your_newsapi_key_here
```

### 2. Start the Python Fact-Checker Service
```bash
cd fact-checker
python server.py
```
- Runs on: `http://localhost:8000`
- Health check: `http://localhost:8000/`

### 3. Start the Java Backend
```bash
cd backend
./mvnw spring-boot:run
```
- Runs on: `http://localhost:8080` (or your configured port)

### 4. Test the Integration

#### Health Check
```bash
curl http://localhost:8080/api/ml/health
```

Expected response includes both services:
```json
{
  "status": "healthy",
  "fact_checker": {
    "status": "healthy",
    "service": "Python Fact-Checker",
    "endpoint": "http://localhost:8000"
  }
}
```

#### Detailed Fact-Check
```bash
curl -X POST http://localhost:8080/api/ml/fact-check \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"COVID-19 vaccines reduce hospitalization rates by 90%\",
    \"sourceUrl\": \"https://www.reuters.com/health/covid-vaccines\"
  }"
```

## API Endpoints

### Java Backend Endpoints

#### `/api/ml/fact-check` (POST)
Enhanced fact-checking with detailed analysis
```json
{
  "text": "News content to verify",
  "sourceUrl": "https://example.com/article" // optional
}
```

Response includes:
- **Basic Analysis**: verification, bias, final verdict
- **Detailed Analysis**: source credibility, content analysis, cross-verification
- **Confidence Score**: 0-1 confidence rating
- **Recommendations**: Actionable advice for users
- **Red Flags**: Potential warning signs

#### `/api/ml/fake-news` (POST)
Original ML service endpoint (still available)

#### `/api/ml/health` (GET)
Health check for both Java and Python services

### Python FastAPI Endpoints

#### `/verify` (POST)
Direct fact-checking endpoint
```json
{
  "text": "Content to verify",
  "source_url": "https://example.com" // optional
}
```

#### `/` (GET)
Health check endpoint

## Response Structure

### Detailed Fact-Check Response
```json
{
  "success": true,
  "message": "Detailed fact-check completed successfully",
  "result": {
    "input": "News content",
    "source_url": "https://example.com",
    "verification": {
      "confirmed": 3,
      "disputed": 1
    },
    "bias": {
      "tone": "REAL",
      "sensational_count": 1
    },
    "final": {
      "score": 5,
      "verdict": "Likely True"
    },
    "detailed_analysis": {
      "source_credibility": {
        "source_trust_level": "High",
        "source_rank": 3,
        "explanation": "Found 3 sources confirming and 1 sources disputing this claim. Original source has high credibility."
      },
      "content_analysis": {
        "sentiment_tone": "REAL",
        "sensational_language": 1,
        "bias_indicators": ["Language patterns suggest legitimate content"],
        "explanation": "Content analysis shows real sentiment with 1 sensational elements. Language appears relatively neutral."
      },
      "cross_verification": {
        "process": "Cross-referenced claim against multiple news sources",
        "sources_found": 4,
        "agreement_ratio": 0.75,
        "explanation": "Searched reputable news sources and found 3 confirming and 1 disputing sources. Strong consensus supports the claim."
      },
      "final_verdict": {
        "verdict": "Likely True",
        "confidence_level": "High",
        "score": 5,
        "explanation": "Final verdict: Likely True (Score: 5). High confidence in assessment."
      },
      "red_flags": [],
      "supporting_evidence": {
        "supporting_sources": 3,
        "contradicting_sources": 1,
        "evidence_strength": "Strong",
        "recommendation": "Claim appears well-supported"
      }
    },
    "confidence_score": 0.78,
    "recommendations": [
      "✅ Claim appears to be supported by evidence",
      "📋 Still recommended to verify with primary sources"
    ],
    "summary": {
      "verdict": "Likely True",
      "score": 5,
      "confidence": 0.78,
      "source_trust": "High"
    },
    "service": "Python Fact-Checker",
    "timestamp": 1699123456789,
    "version": "1.0"
  }
}
```

## Frontend Integration

### JavaScript/React Example
```javascript
const factCheck = async (text, sourceUrl = null) => {
  try {
    const response = await fetch('/api/ml/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` // if auth required
      },
      body: JSON.stringify({ text, sourceUrl })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const result = data.result;
      
      // Display verdict
      console.log('Verdict:', result.summary.verdict);
      console.log('Confidence:', result.summary.confidence);
      
      // Show detailed analysis
      console.log('Source Trust:', result.summary.source_trust);
      console.log('Recommendations:', result.recommendations);
      
      return result;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Fact-check failed:', error);
    throw error;
  }
};

// Usage
factCheck("COVID-19 vaccines are effective", "https://reuters.com/article")
  .then(result => {
    // Handle successful fact-check
    displayResults(result);
  })
  .catch(error => {
    // Handle error
    showError(error.message);
  });
```

## Troubleshooting

### Common Issues

1. **Python service not responding**
   - Check if FastAPI server is running on port 8000
   - Verify no firewall blocking localhost:8000

2. **NewsAPI not working**
   - Verify API key is set correctly
   - Check API key quota/limits
   - Service will work without API key but with limited source verification

3. **ML model download slow**
   - First run downloads the fake news detection model (~500MB)
   - Subsequent runs use cached model

4. **Java service connection error**
   - Ensure both services are running
   - Check port configurations match

### Logs and Debugging

#### Python Service Logs
```bash
cd fact-checker
python server.py
# Watch console output for errors
```

#### Java Service Logs
Check Spring Boot console output for connection errors to Python service.

## Performance Notes

- **First Request**: May take 30-60 seconds due to ML model loading
- **Subsequent Requests**: Typically 2-5 seconds depending on NewsAPI response
- **Caching**: Consider implementing Redis caching for frequently checked content
- **Rate Limiting**: NewsAPI has rate limits; implement request queuing if needed

## Security Considerations

- **API Keys**: Never expose NewsAPI key in frontend code
- **Input Validation**: Both services validate input text
- **CORS**: Configure CORS settings for your frontend domain
- **Authentication**: Java endpoints can require authentication

Task status: Complete integration guide created with setup instructions, API documentation, and troubleshooting tips.
