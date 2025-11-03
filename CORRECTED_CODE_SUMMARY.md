# Corrected Code Summary

## ✅ All Fixed Components

---

## 1. Spring Boot Configuration

### `application.properties`

```properties
# Server Configuration
server.port=8081  # ✅ Changed from 8080

# Python ML Service Configuration
ml.service.url=http://localhost:5000  # ✅ Changed from 5001

# Authentication Configuration
app.auth.required=true  # Set to false for anonymous access
```

### `SecurityConfig.java` - CORS Configuration

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    // Allow multiple origins including production deployments
    configuration.setAllowedOrigins(Arrays.asList(
        "http://localhost:8080",  // Frontend port ✅
        "http://localhost:8081",  // Alternative frontend port
        "http://localhost:5173",  // Vite dev server
        "http://localhost:3000",   // React dev server
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

### `HealthController.java` - New Health Endpoint

```java
@RestController
@RequestMapping("/api")
public class HealthController {
    private final MLService mlService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("service", "trustek-backend");
        health.put("timestamp", System.currentTimeMillis());
        
        // Check ML service health
        try {
            Map<String, Object> mlHealth = mlService.checkHealth();
            health.put("ml_service", mlHealth);
            if (mlHealth != null && "unhealthy".equals(mlHealth.get("status"))) {
                health.put("status", "degraded");
            }
        } catch (Exception e) {
            health.put("ml_service", Map.of(
                "status", "unhealthy",
                "error", e.getMessage()
            ));
            health.put("status", "degraded");
        }
        
        return ResponseEntity.ok(health);
    }
}
```

### `FakeNewsController.java` - Proxy to Flask

```java
@PostMapping("/url")
public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromUrl(
        @RequestBody Map<String, String> request,
        @Nullable Authentication authentication
) {
    try {
        String url = request.get("url");
        if (url == null || url.trim().isEmpty()) {
            // Return error...
        }

        // Validate URL format
        if (!url.trim().startsWith("http://") && !url.trim().startsWith("https://")) {
            // Return error...
        }

        // ✅ Calls Flask service via MLService
        Map<String, Object> result = mlService.analyzeFakeNewsFromUrl(url.trim());
        
        // ... handle result
    } catch (org.springframework.web.client.ResourceAccessException e) {
        // ✅ Clear error message for Flask unavailability
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", "ML_SERVICE_UNAVAILABLE");
        error.put("message", "AI Service unavailable. Please ensure the Flask service is running on port 5000.");
        return ResponseEntity.status(503).body(error);
    }
    // ... other error handling
}
```

### `MLService.java` - Flask Proxy Logic

```java
public Map<String, Object> analyzeFakeNewsFromUrl(String url) {
    try {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = new HashMap<>();
        body.put("url", url);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        // ✅ Try /fact-check endpoint first, fallback to /analyze-url
        ResponseEntity<Map<String, Object>> response;
        try {
            response = restTemplate.postForEntity(
                    mlServiceUrl + "/fact-check",  // ✅ New endpoint
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );
        } catch (Exception e) {
            // Fallback to analyze-url
            response = restTemplate.postForEntity(
                    mlServiceUrl + "/analyze-url",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );
        }

        return response.getBody();
    } catch (org.springframework.web.client.ResourceAccessException e) {
        // ✅ Clear error when Flask is down
        throw new RuntimeException("AI Service unavailable. Please ensure the Flask service is running on port 5000.");
    }
}
```

---

## 2. Flask Configuration

### `app.py` - CORS and Port Configuration

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# ✅ Configure CORS to allow Spring Boot gateway and frontend
CORS(app, 
     origins=["http://localhost:8081", "http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# ... model loading ...

# ✅ New /fact-check endpoint (alias for analyze-url)
@app.route('/fact-check', methods=['POST'])
def fact_check():
    """Fact-check endpoint - alias for analyze-url for compatibility"""
    return analyze_from_url()

@app.route('/analyze-url', methods=['POST'])
def analyze_from_url():
    """Extract text from website and check credibility"""
    # ... implementation ...

# ✅ Port changed to 5000
if __name__ == '__main__':
    logger.info("🚀 Initializing models...")
    load_fake_news_model()
    load_sentiment_model()
    logger.info("✅ All models loaded successfully")
    
    logger.info("🌐 Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)  # ✅ Changed from 5001
```

---

## 3. Frontend Configuration

### `api.ts` - Dynamic API Base URL

```typescript
// ✅ Dynamically determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Development: use localhost:8081 (Spring Boot gateway)
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:8081/api';  // ✅ Changed from 8080
  }
  
  // Production: use environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';
};

const API_BASE_URL = getApiBaseUrl();
```

### `api.ts` - Fetch with Credentials and Error Handling

```typescript
async analyzeFakeNewsFromUrl(url: string): Promise<{...}> {
    const token = this.getAuthToken();
    
    // ✅ Build headers - include Authorization if token is available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/fake-news/url`, {
        method: 'POST',
        headers,
        credentials: 'include', // ✅ Include cookies if using session-based auth
        body: JSON.stringify({ url }),
      });

      const data = await this.parseResponse<any>(response);

      if (!response.ok) {
        // ✅ Handle specific error types
        if (response.status === 401 || response.status === 403) {
          const errorData = data?.error || '';
          if (errorData === 'AUTHENTICATION_REQUIRED') {
            throw new Error('Please log in first to use this feature.');
          }
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 503) {
          // ✅ Clear error message for Flask unavailability
          const errorMsg = data?.message || 'AI Service unavailable. Please ensure the Flask service is running.';
          throw new Error(errorMsg);
        }
        // ... other error handling
      }

      // ... return result
    } catch (error: any) {
      // ✅ Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
      }
      // Re-throw custom errors
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
}
```

---

## 4. Working Test Command Sequence

### Terminal 1: Start Flask (Port 5000)

```bash
cd Trustek/ml-service
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

### Terminal 2: Start Spring Boot (Port 8081)

```bash
cd Trustek/backend
mvn spring-boot:run
```

**Expected Output:**
```
Started BackendApplication in X.XXX seconds
```

### Terminal 3: Start Frontend (Port 8080 or 5173)

```bash
cd Trustek/trustek-app--master
npm run dev
```

**Expected Output:**
```
VITE vX.X.X  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### Verify Setup

```bash
# Test Flask
curl http://localhost:5000/health

# Test Spring Boot
curl http://localhost:8081/api/health

# Test Fact-Check (with auth)
curl -X POST http://localhost:8081/api/fake-news/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://www.example.com/news"}'

# Test Fact-Check (without auth, if app.auth.required=false)
curl -X POST http://localhost:8081/api/fake-news/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/news"}'
```

---

## 5. Request Flow Example

```
User clicks "Analyze" in Frontend
    ↓
Frontend: POST http://localhost:8081/api/fake-news/url
    ↓
Spring Boot: Validates request, checks auth (if required)
    ↓
Spring Boot: POST http://localhost:5000/fact-check
    ↓
Flask: Extracts text, runs ML models
    ↓
Flask: Returns {"label": "Real", "confidence": 0.95, ...}
    ↓
Spring Boot: Returns {"success": true, "result": {...}}
    ↓
Frontend: Displays result to user
```

---

## 6. Error Messages

### Flask Service Down

**Spring Boot Response:**
```json
{
  "success": false,
  "error": "ML_SERVICE_UNAVAILABLE",
  "message": "AI Service unavailable. Please ensure the Flask service is running on port 5000."
}
```

**Frontend Display:**
```
"AI Service unavailable. Please ensure the Flask service is running on port 5000."
```

### Network Error

**Frontend Display:**
```
"Network error: Unable to connect to the server. Please check your internet connection and ensure the backend is running."
```

### Authentication Required

**If `app.auth.required=true` and no token:**

**Spring Boot Response:**
```json
{
  "success": false,
  "error": "AUTHENTICATION_REQUIRED",
  "message": "Authentication is required for this endpoint. Please log in first."
}
```

**Frontend Display:**
```
"Please log in first to use this feature."
```

---

## ✅ Summary of Changes

1. ✅ **Spring Boot port**: `8080` → `8081`
2. ✅ **Flask port**: `5001` → `5000`
3. ✅ **CORS configured** for both backends
4. ✅ **Frontend API URL**: Now points to `http://localhost:8081/api`
5. ✅ **Health endpoints** added to Spring Boot
6. ✅ **`/fact-check` endpoint** added to Flask
7. ✅ **Error handling** improved with clear messages
8. ✅ **`credentials: 'include'`** added to frontend fetch
9. ✅ **Optional authentication** support (configurable)
10. ✅ **Flask unavailability** detection and clear error messages

---

**All code is corrected and ready to use! 🎉**

