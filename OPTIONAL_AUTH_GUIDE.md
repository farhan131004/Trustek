# Optional Authentication Configuration Guide

## Overview

The application now supports **optional authentication** for the `/api/fake-news/**` endpoints. You can configure whether authentication is required or allow anonymous access.

---

## Configuration

### Backend Configuration (`application.properties`)

```properties
# Authentication Configuration
# Set to false to allow anonymous access to /api/fake-news/** endpoints
# Set to true to require authentication for all endpoints
app.auth.required=true
```

**Options:**
- `app.auth.required=true` - **Requires authentication** (default)
- `app.auth.required=false` - **Allows anonymous access**

---

## How It Works

### When `app.auth.required=true` (Default)

1. **Security Configuration** requires authentication for `/api/fake-news/**` endpoints
2. **Frontend** sends JWT token if available
3. **Backend** validates token and processes request
4. **If no token**: Returns 401/403 with clear error message

### When `app.auth.required=false`

1. **Security Configuration** allows anonymous access to `/api/fake-news/**` endpoints
2. **Frontend** optionally sends JWT token (if user is logged in)
3. **Backend** processes request with or without authentication
4. **No token required**: Request succeeds without authentication

---

## Backend Changes

### 1. SecurityConfig.java

**What Changed:**
- Added `@Value("${app.auth.required:true}")` to read configuration
- Conditionally configures security based on `authRequired` flag
- When `false`, allows `permitAll()` for `/api/fake-news/**` endpoints

**Key Code:**
```java
@Value("${app.auth.required:true}")
private boolean authRequired;

if (authRequired) {
    // Require authentication
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/fake-news/**", "/api/ml/**").authenticated()
        ...
    );
} else {
    // Allow anonymous access
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/fake-news/**", "/api/ml/**").permitAll()
        ...
    );
}
```

### 2. FakeNewsController.java

**What Changed:**
- Changed `Authentication` parameter to `@Nullable Authentication`
- Made authentication optional in `/url` and `/image` endpoints
- `/analyze` endpoint still checks for authentication (if required by business logic)

**Key Code:**
```java
@PostMapping("/url")
public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromUrl(
        @RequestBody Map<String, String> request,
        @Nullable Authentication authentication  // Now optional
) {
    // Works with or without authentication
    ...
}
```

### 3. CORS Configuration

**Already Configured:**
- ✅ `credentials: 'include'` support
- ✅ All necessary headers allowed
- ✅ Authorization header exposed
- ✅ Preflight caching enabled

---

## Frontend Changes

### 1. api.ts - Optional Token Sending

**What Changed:**
- Removed hard requirement for token
- Sends token only if available
- Includes `credentials: 'include'` for cookie support
- Better error handling for authentication failures

**Key Code:**
```typescript
async analyzeFakeNewsFromUrl(url: string) {
    const token = this.getAuthToken();
    
    // Build headers - include Authorization if token is available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/fake-news/url`, {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies if using session-based auth
      body: JSON.stringify({ url }),
    });
    
    // Error handling checks for AUTHENTICATION_REQUIRED
    if (response.status === 401 || response.status === 403) {
      const errorData = data?.error || '';
      if (errorData === 'AUTHENTICATION_REQUIRED') {
        throw new Error('Please log in first to use this feature.');
      }
      throw new Error('Authentication failed. Please log in again.');
    }
}
```

### 2. Error Handling

**Improved Messages:**
- `AUTHENTICATION_REQUIRED` → "Please log in first to use this feature."
- Network errors → Clear connection messages
- 401/403 → Specific authentication error messages

---

## Testing Guide

### Test 1: Anonymous Access (when `app.auth.required=false`)

```bash
# 1. Set in application.properties:
app.auth.required=false

# 2. Restart backend

# 3. Clear browser localStorage:
localStorage.clear()

# 4. Try analyzing a URL without logging in
# Expected: ✅ Request succeeds
```

### Test 2: Required Authentication (when `app.auth.required=true`)

```bash
# 1. Set in application.properties:
app.auth.required=true

# 2. Restart backend

# 3. Clear browser localStorage:
localStorage.clear()

# 4. Try analyzing a URL without logging in
# Expected: ❌ "Please log in first to use this feature."
```

### Test 3: With Valid Token

```bash
# 1. Log in first (get JWT token)

# 2. Try analyzing a URL
# Expected: ✅ Request succeeds with authentication
```

### Test 4: Verify CORS

```bash
# 1. Open browser DevTools → Network tab

# 2. Make a request

# 3. Check Request Headers:
#    - Authorization: Bearer <token> (if logged in)
#    - Origin: http://localhost:8081

# 4. Check Response Headers:
#    - Access-Control-Allow-Origin: http://localhost:8081
#    - Access-Control-Allow-Credentials: true
```

---

## Manual Verification Checklist

| Check | How to Verify | Expected Result |
|-------|---------------|-----------------|
| **JWT Token Sent** | DevTools → Network → Request Headers | `Authorization: Bearer <token>` (if logged in) |
| **Cookie Sent** | DevTools → Network → Request Headers | Cookies included (if using sessions) |
| **CORS Headers** | DevTools → Network → Response Headers | `Access-Control-Allow-Origin` present |
| **Anonymous Access** | Clear localStorage → Make request | Works if `app.auth.required=false` |
| **Auth Required** | Clear localStorage → Make request | Shows "Please log in first" if `app.auth.required=true` |
| **Error Messages** | Try invalid request | Clear, user-friendly messages |

---

## How to Bypass Authentication Middleware

### In Spring Boot (Current Setup)

The authentication is controlled by Spring Security configuration, not a separate middleware:

**Option 1: Configuration Property (Recommended)**
```properties
# In application.properties
app.auth.required=false
```

**Option 2: Security Configuration**
```java
// In SecurityConfig.java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/fake-news/**").permitAll()  // Bypass auth
    ...
);
```

### If Using Express/Node.js Middleware

If you were using Express middleware (like `authMiddleware.js`), you would bypass it like this:

```javascript
// routes/fakeNews.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Option 1: Skip middleware entirely
router.post('/analyze', async (req, res) => {
  // No auth middleware - public endpoint
});

// Option 2: Conditional middleware
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    return authenticateToken(req, res, next);
  }
  next(); // Continue without authentication
};

router.post('/analyze', optionalAuth, async (req, res) => {
  // Works with or without auth
  const userId = req.user?.id; // May be undefined
});
```

---

## Corrected Code Examples

### Backend Route (Spring Boot)

```java
@RestController
@RequestMapping("/api/fake-news")
public class FakeNewsController {
    
    @PostMapping("/url")
    public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromUrl(
            @RequestBody Map<String, String> request,
            @Nullable Authentication authentication  // Optional!
    ) {
        // Works with or without authentication
        String url = request.get("url");
        Map<String, Object> result = mlService.analyzeFakeNewsFromUrl(url);
        return ResponseEntity.ok(result);
    }
}
```

### Frontend Fetch Request

```typescript
async analyzeFakeNewsFromUrl(url: string) {
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Include token if available (optional)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/fake-news/url`, {
      method: 'POST',
      headers,
      credentials: 'include',  // For cookies
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const data = await response.json();
            if (data?.error === 'AUTHENTICATION_REQUIRED') {
                throw new Error('Please log in first to use this feature.');
            }
            throw new Error('Authentication failed. Please log in again.');
        }
        // Handle other errors...
    }

    return await response.json();
}
```

---

## Production Deployment

### Environment-Specific Configuration

**Development (`application-dev.properties`):**
```properties
app.auth.required=false  # Allow testing without auth
```

**Production (`application-prod.properties`):**
```properties
app.auth.required=true   # Require authentication
```

### Environment Variables

```bash
# Set via environment variable
export APP_AUTH_REQUIRED=true

# Or in Docker
docker run -e APP_AUTH_REQUIRED=true ...
```

---

## Summary

✅ **Configuration-based** - Control via `app.auth.required` property  
✅ **Optional authentication** - Works with or without tokens  
✅ **Clear error messages** - User-friendly authentication errors  
✅ **CORS configured** - Properly handles credentials  
✅ **Frontend ready** - Sends token if available, handles errors gracefully  

---

## Quick Reference

| Setting | Behavior |
|---------|----------|
| `app.auth.required=true` | Requires JWT token, returns 401 if missing |
| `app.auth.required=false` | Allows anonymous access, token optional |
| Frontend with token | Always sends token if available |
| Frontend without token | Still works if `app.auth.required=false` |

---

## Troubleshooting

### Issue: "Please log in first" when token is present

**Solution:**
1. Check token in localStorage: `localStorage.getItem('trustek_tokens')`
2. Verify token format: Should be `Bearer <token>` in Authorization header
3. Check backend logs for JWT validation errors

### Issue: CORS errors

**Solution:**
1. Verify frontend origin is in `allowedOrigins` list
2. Check `credentials: 'include'` is set in fetch
3. Ensure backend CORS config has `allowCredentials: true`

### Issue: Request fails with anonymous access enabled

**Solution:**
1. Restart backend after changing `app.auth.required`
2. Check Spring Security logs for authorization decisions
3. Verify SecurityConfig is reading the property correctly

