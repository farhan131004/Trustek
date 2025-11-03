# Complete Integration Setup Guide

## 🎯 Architecture Overview

```
Frontend (React)           Spring Boot Gateway          Flask AI Service
localhost:8080/5173   →    localhost:8081        →     localhost:5000
     ↓                           ↓                            ↓
  React App            API Gateway/Proxy          Fact-Checking ML Models
```

## ✅ Fixed Configuration

### Port Configuration
- **Frontend**: `localhost:8080` or `localhost:5173` (Vite)
- **Spring Boot**: `localhost:8081` ✅
- **Flask**: `localhost:5000` ✅

### CORS Configuration
- ✅ Spring Boot allows all frontend origins
- ✅ Flask allows Spring Boot gateway and frontend
- ✅ Credentials enabled for both

---

## 📋 Setup Instructions

### Step 1: Start Flask Service (Port 5000)

```bash
cd Trustek/ml-service

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start Flask service
python app.py
```

**Expected Output:**
```
🚀 Initializing models...
✅ Fake news model loaded successfully
✅ Sentiment model loaded successfully
✅ All models loaded successfully
🌐 Starting Flask server on port 5000...
```

**Verify Flask is running:**
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "fake_news_model_loaded": true,
  "sentiment_model_loaded": true,
  "device": "cpu"
}
```

### Step 2: Start Spring Boot Gateway (Port 8081)

```bash
cd Trustek/backend

# Build and run (if using Maven)
mvn spring-boot:run

# Or if already built
java -jar target/trustek-backend-*.jar
```

**Expected Output:**
```
Started BackendApplication in X.XXX seconds
```

**Verify Spring Boot is running:**
```bash
curl http://localhost:8081/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "trustek-backend",
  "timestamp": 1234567890,
  "ml_service": {
    "status": "healthy",
    "fake_news_model_loaded": true,
    "sentiment_model_loaded": true,
    "device": "cpu"
  }
}
```

### Step 3: Start Frontend (Port 8080 or 5173)

```bash
cd Trustek/trustek-app--master

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

**Verify Frontend is running:**
- Open browser: `http://localhost:8080` or `http://localhost:5173`

---

## 🧪 Testing Endpoints

### Test 1: Flask Health Check

```bash
curl http://localhost:5000/health
```

### Test 2: Spring Boot Health Check

```bash
curl http://localhost:8081/api/health
```

### Test 3: Fact-Check via Spring Boot (Proxy to Flask)

```bash
curl -X POST http://localhost:8081/api/fake-news/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://www.example.com/news"}'
```

**Or without authentication (if `app.auth.required=false`):**

```bash
curl -X POST http://localhost:8081/api/fake-news/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/news"}'
```

### Test 4: Direct Flask Fact-Check

```bash
curl -X POST http://localhost:5000/fact-check \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/news"}'
```

---

## 🔧 Configuration Files

### Backend (`application.properties`)

```properties
# Server Configuration
server.port=8081

# Python ML Service Configuration
ml.service.url=http://localhost:5000

# Authentication Configuration
app.auth.required=true  # Set to false for anonymous access
```

### Flask (`app.py`)

```python
# CORS Configuration
CORS(app, 
     origins=["http://localhost:8081", "http://localhost:8080", "http://localhost:5173"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Port Configuration
app.run(host='0.0.0.0', port=5000, debug=False)
```

### Frontend (`api.ts`)

```typescript
// Automatically detects environment and uses correct URL
const API_BASE_URL = getApiBaseUrl(); // Returns http://localhost:8081/api in dev
```

---

## 🔄 Request Flow

### Example: User Analyzes URL

1. **Frontend** → `POST http://localhost:8081/api/fake-news/url`
   ```json
   {
     "url": "https://example.com/news"
   }
   ```

2. **Spring Boot** → Validates request, checks authentication (if required)

3. **Spring Boot** → `POST http://localhost:5000/fact-check`
   ```json
   {
     "url": "https://example.com/news"
   }
   ```

4. **Flask** → Extracts text, analyzes with ML models

5. **Flask** → Returns result to Spring Boot
   ```json
   {
     "label": "Real",
     "confidence": 0.95,
     "source_status": "Safe",
     "summary": "Website appears safe."
   }
   ```

6. **Spring Boot** → Returns result to Frontend
   ```json
   {
     "success": true,
     "message": "Analysis completed successfully",
     "result": {
       "label": "Real",
       "confidence": 0.95,
       "source_status": "Safe",
       "summary": "Website appears safe."
     }
   }
   ```

---

## 🚨 Error Handling

### Flask Service Down

**Frontend Error:**
```
"AI Service unavailable. Please ensure the Flask service is running on port 5000."
```

**Spring Boot Response:**
```json
{
  "success": false,
  "error": "ML_SERVICE_UNAVAILABLE",
  "message": "AI Service unavailable. Please ensure the Flask service is running on port 5000."
}
```

### Authentication Required

**If `app.auth.required=true` and no token:**
```json
{
  "success": false,
  "error": "AUTHENTICATION_REQUIRED",
  "message": "Authentication is required for this endpoint. Please log in first."
}
```

**Frontend shows:**
```
"Please log in first to use this feature."
```

### Network Error

**Frontend shows:**
```
"Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running."
```

---

## 🧪 Test Both Authentication Modes

### Test Mode 1: Authentication Required (`app.auth.required=true`)

```properties
# In application.properties
app.auth.required=true
```

**Steps:**
1. Restart Spring Boot
2. Try analyzing URL without logging in
3. **Expected**: "Please log in first to use this feature."
4. Log in, then try again
5. **Expected**: ✅ Analysis succeeds

### Test Mode 2: Anonymous Access (`app.auth.required=false`)

```properties
# In application.properties
app.auth.required=false
```

**Steps:**
1. Restart Spring Boot
2. Clear localStorage: `localStorage.clear()`
3. Try analyzing URL without logging in
4. **Expected**: ✅ Analysis succeeds without authentication

---

## 📝 Key Endpoints

### Spring Boot Gateway (Port 8081)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/login` | POST | No | User login |
| `/api/auth/register` | POST | No | User registration |
| `/api/fake-news/url` | POST | Conditional | Analyze URL (proxies to Flask) |
| `/api/fake-news/image` | POST | Conditional | Analyze image (proxies to Flask) |
| `/api/ml/fake-news` | POST | Conditional | Analyze text (proxies to Flask) |

### Flask AI Service (Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/fact-check` | POST | Fact-check URL (alias for analyze-url) |
| `/analyze-url` | POST | Extract and analyze URL content |
| `/analyze-image` | POST | OCR and analyze image |
| `/fake-news` | POST | Analyze text for fake news |
| `/review` | POST | Sentiment analysis |
| `/scan` | POST | Website safety scan |

---

## 🔍 Troubleshooting

### Issue: "Network error: Unable to connect"

**Check:**
1. ✅ Flask is running on port 5000
2. ✅ Spring Boot is running on port 8081
3. ✅ Frontend is pointing to `http://localhost:8081/api`
4. ✅ No firewall blocking ports

**Test:**
```bash
# Test Flask
curl http://localhost:5000/health

# Test Spring Boot
curl http://localhost:8081/api/health
```

### Issue: CORS Errors

**Check:**
1. ✅ Spring Boot CORS includes frontend origin
2. ✅ Flask CORS includes Spring Boot origin
3. ✅ `credentials: 'include'` in frontend fetch

**Verify CORS:**
```bash
# Check Spring Boot CORS
curl -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8081/api/fake-news/url \
     -v
```

### Issue: "AI Service unavailable"

**Check:**
1. ✅ Flask service is running: `curl http://localhost:5000/health`
2. ✅ Spring Boot config: `ml.service.url=http://localhost:5000`
3. ✅ No port conflicts

**Fix:**
```bash
# Restart Flask
cd ml-service
python app.py

# Verify
curl http://localhost:5000/health
```

---

## ✅ Verification Checklist

- [ ] Flask running on port 5000
- [ ] Spring Boot running on port 8081
- [ ] Frontend running on port 8080 or 5173
- [ ] Flask health check: `curl http://localhost:5000/health`
- [ ] Spring Boot health check: `curl http://localhost:8081/api/health`
- [ ] CORS configured correctly
- [ ] Frontend API base URL points to `http://localhost:8081/api`
- [ ] Authentication mode tested (both true/false)
- [ ] Error messages display correctly

---

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start Flask
cd Trustek/ml-service
python app.py

# Terminal 2: Start Spring Boot
cd Trustek/backend
mvn spring-boot:run

# Terminal 3: Start Frontend
cd Trustek/trustek-app--master
npm run dev
```

**Then open:** `http://localhost:8080` or `http://localhost:5173`

---

## 📚 Related Files

- **Spring Boot Config**: `backend/src/main/resources/application.properties`
- **Spring Boot CORS**: `backend/src/main/java/com/trustek/config/SecurityConfig.java`
- **Flask Config**: `ml-service/app.py`
- **Frontend API**: `trustek-app--master/src/services/api.ts`
- **Health Controller**: `backend/src/main/java/com/trustek/controller/HealthController.java`

---

## 🎉 Success Indicators

When everything is working correctly:

1. ✅ Flask health check returns `{"status": "healthy"}`
2. ✅ Spring Boot health check returns `{"status": "healthy", "ml_service": {...}}`
3. ✅ Frontend can analyze URLs/images
4. ✅ No CORS errors in browser console
5. ✅ Clear error messages when services are down
6. ✅ Authentication works (or is bypassed) based on config

---

**All set! Your Fact Checker app is now properly integrated! 🎊**

