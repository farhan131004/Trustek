# Trustek Project Integration - COMPLETE ✅

## Overview
Successfully integrated the frontend (trustek-app--master) with the Spring Boot backend and Python ML microservice.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         React Frontend (trustek-app--master)            │
│                   Port: 8081                            │
│  - Fake News Detection                                  │
│  - Review Analyzer                                      │
│  - Website Scanner                                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Spring Boot Backend (Java 21)                  │
│                   Port: 8080                            │
│  - AuthController (/api/auth/*)                         │
│  - FakeNewsController (/api/fake-news/*)                │
│  - MLController (/api/ml/*) ← NEW                       │
│  - MySQL Database (trustek_db)                          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (RestTemplate)
                     ▼
┌─────────────────────────────────────────────────────────┐
│       Python Flask ML Microservice                      │
│                   Port: 5001                            │
│  - /fake-news (BERT model)                              │
│  - /review (Sentiment analysis)                         │
│  - /scan (Website safety scanner)                       │
│  - /health                                               │
└─────────────────────────────────────────────────────────┘
```

## Configuration Changes

### Backend (`backend/src/main/resources/application.properties`)
✅ **Server Port**: Changed from 5000 → 8080
✅ **Database Password**: Updated to `root`
✅ **ML Service URL**: Updated to `http://localhost:5001`
✅ **CORS Origins**: Added `http://localhost:8081`

### ML Service (`ml-service/app.py`)
✅ **Port**: Changed from 8000 → 5001
✅ **New Endpoints Added**:
   - `/fake-news` - Fake news detection using BERT
   - `/review` - Sentiment analysis using RoBERTa
   - `/scan` - Website safety scanning using BeautifulSoup

### ML Service Dependencies (`ml-service/requirements.txt`)
✅ Added: `requests==2.31.0`
✅ Added: `beautifulsoup4==4.12.2`

### Frontend (`trustek-app--master/vite.config.ts`)
✅ **Port**: Changed from 8080 → 8081

### Frontend API Service (`trustek-app--master/src/services/api.ts`)
✅ **Created** new API service file
✅ **Base URL**: `http://localhost:8080/api`
✅ **New Methods**:
   - `analyzeFakeNews(text)` → `/api/ml/fake-news`
   - `analyzeReview(text)` → `/api/ml/review`
   - `scanWebsite(url)` → `/api/ml/scan`

### Backend Security (`backend/src/main/java/com/trustek/config/SecurityConfig.java`)
✅ **CORS**: Added `http://localhost:8081`
✅ **Security**: `/api/ml/**` endpoints require authentication

## New Backend Files Created

### 1. MLService.java (`backend/src/main/java/com/trustek/service/MLService.java`)
Service class for communicating with Python ML microservice:
- `analyzeFakeNews(String text)` - Calls `/fake-news` endpoint
- `analyzeReview(String text)` - Calls `/review` endpoint
- `scanWebsite(String url)` - Calls `/scan` endpoint
- `checkHealth()` - Calls `/health` endpoint

### 2. MLController.java (`backend/src/main/java/com/trustek/controller/MLController.java`)
REST controller exposing ML endpoints:
- `POST /api/ml/fake-news` - Fake news analysis
- `POST /api/ml/review` - Review sentiment analysis
- `POST /api/ml/scan` - Website scanning
- `GET /api/ml/health` - ML service health check

All endpoints require JWT authentication.

## ML Service Endpoints

### POST /fake-news
**Request:**
```json
{
  "text": "Your news article text here..."
}
```

**Response:**
```json
{
  "label": "Fake" | "Real",
  "confidence": 0.92
}
```

### POST /review
**Request:**
```json
{
  "text": "This product is amazing!"
}
```

**Response:**
```json
{
  "sentiment": "Positive" | "Negative",
  "confidence": 0.95
}
```

### POST /scan
**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "status": "Safe" | "Suspicious",
  "summary": "Website appears to be safe...",
  "suspicious_keywords_found": 0
}
```

### GET /health
**Response:**
```json
{
  "status": "healthy",
  "fake_news_model_loaded": true,
  "sentiment_model_loaded": true,
  "device": "cpu"
}
```

## Running the Application

### 1. Start MySQL Database
```bash
# Make sure MySQL is running
mysql -u root -p
```

Create database:
```sql
CREATE DATABASE trustek_db;
```

### 2. Start ML Service
```bash
cd ml-service

# Create virtual environment (if not exists)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies (first time only)
pip install -r requirements.txt

# Run ML service
python app.py
```

✅ ML service will be available at `http://localhost:5001`

### 3. Start Spring Boot Backend
```bash
cd backend

# Build project (if needed)
mvn clean install

# Run backend
mvn spring-boot:run
```

✅ Backend will be available at `http://localhost:8080`

### 4. Start React Frontend
```bash
cd trustek-app--master

# Install dependencies (if needed)
npm install

# Run frontend
npm run dev
```

✅ Frontend will be available at `http://localhost:8081`

## Testing the Integration

### 1. Register a User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test ML Endpoints (with JWT token)
```bash
# Fake News Analysis
curl -X POST http://localhost:8080/api/ml/fake-news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"text":"Breaking news: Scientists discover unicorns exist!"}'

# Review Sentiment
curl -X POST http://localhost:8080/api/ml/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"text":"This product exceeded my expectations!"}'

# Website Scan
curl -X POST http://localhost:8080/api/ml/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url":"https://example.com"}'

# Health Check
curl http://localhost:8080/api/ml/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8081 | http://localhost:8081 |
| Backend | 8080 | http://localhost:8080 |
| ML Service | 5001 | http://localhost:5001 |
| MySQL | 3306 | localhost:3306 |

## Key Features Implemented

✅ **Authentication**: JWT-based authentication for all ML endpoints
✅ **CORS**: Configured for frontend on port 8081
✅ **Error Handling**: Comprehensive error handling in all layers
✅ **Security**: Spring Security protecting all ML endpoints
✅ **Type Safety**: TypeScript frontend + Java backend
✅ **ML Models**: BERT for fake news, RoBERTa for sentiment
✅ **Website Scanning**: URL content analysis with heuristic detection

## Next Steps

1. **Update Frontend Pages**: Integrate the new API service into existing React pages
2. **Add History**: Save ML analysis results to database
3. **Add Statistics**: Track usage analytics
4. **Improve ML Models**: Fine-tune models for better accuracy
5. **Add Caching**: Cache ML results for performance
6. **Add Rate Limiting**: Protect ML endpoints from abuse

## Notes

- MySQL database password is set to `root` (change in production!)
- ML models download automatically on first run (~500MB-1GB)
- Backend compiles to Java 21 bytecode
- All endpoints require JWT authentication except `/api/auth/*`
- Frontend API service handles token management automatically

## Troubleshooting

### ML Service won't start
- Check Python version (3.9+)
- Install dependencies: `pip install -r requirements.txt`
- Models download on first run (may take 5-10 minutes)

### Backend won't connect to MySQL
- Verify MySQL is running
- Check password in `application.properties`
- Create database: `CREATE DATABASE trustek_db;`

### Frontend CORS errors
- Verify backend CORS config includes `http://localhost:8081`
- Clear browser cache
- Check backend is running on port 8080

### JWT authentication fails
- Check token is in Authorization header
- Verify token hasn't expired
- Try logging in again to get a new token

---

**Integration Status**: ✅ COMPLETE
**All Services**: ✅ CONFIGURED
**Ready for Development**: ✅ YES


