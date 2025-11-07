package com.trustek.controller;

import com.trustek.dto.FakeNewsAnalysisRequest;
import com.trustek.dto.FakeNewsAnalysisResponse;
import com.trustek.service.FakeNewsService;
import com.trustek.service.MLService;
import com.trustek.service.BlacklistService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for fake news analysis endpoints
 */
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/fake-news")
public class FakeNewsController {

    private final FakeNewsService fakeNewsService;
    private final MLService mlService;
    private final BlacklistService blacklistService;
    
    public FakeNewsController(FakeNewsService fakeNewsService, MLService mlService, BlacklistService blacklistService) {
        this.fakeNewsService = fakeNewsService;
        this.mlService = mlService;
        this.blacklistService = blacklistService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeFakeNews(
            @Valid @RequestBody FakeNewsAnalysisRequest request,
            @Nullable Authentication authentication
    ) {
        try {
            // If authentication is required but not provided, return error
            if (authentication == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "AUTHENTICATION_REQUIRED");
                error.put("message", "Authentication is required for this endpoint. Please log in first.");
                return ResponseEntity.status(401).body(error);
            }
            
            FakeNewsAnalysisResponse response = fakeNewsService.analyzeFakeNews(
                    authentication.getName(),
                    request
            );
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Analysis completed successfully");
            result.put("result", response);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/url")
    public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromUrl(
            @RequestBody Map<String, String> request,
            @Nullable Authentication authentication
    ) {
        try {
            String url = request.get("url");
            if (url == null || url.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "URL_REQUIRED");
                error.put("message", "URL field is required");
                return ResponseEntity.badRequest().body(error);
            }

            // Validate URL format
            if (!url.trim().startsWith("http://") && !url.trim().startsWith("https://")) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "INVALID_URL");
                error.put("message", "URL must start with http:// or https://");
                return ResponseEntity.badRequest().body(error);
            }

            String normalized = url.trim();
            // Block if already blacklisted
            if (blacklistService.isBlacklisted(normalized)) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "URL_BLACKLISTED");
                error.put("message", "URL is blacklisted due to low credibility");
                BlacklistService.Entry entry = blacklistService.get(normalized);
                if (entry != null) {
                    Map<String, Object> bl = new HashMap<>();
                    bl.put("credibility_score", entry.credibilityScore);
                    bl.put("source", entry.source);
                    bl.put("timestamp", entry.timestamp);
                    bl.put("reason", entry.reason);
                    error.put("blacklist", bl);
                }
                return ResponseEntity.status(403).body(error);
            }

            Map<String, Object> result = mlService.analyzeFakeNewsFromUrl(normalized);

            // Structured credibility score for blacklisting decision
            Map<String, Object> structured = new HashMap<>();
            try {
                structured = mlService.analyzeStructuredUrl(normalized);
            } catch (RuntimeException ignored) {}
            Integer score = null;
            if (structured != null && structured.get("credibility_score") instanceof Number) {
                score = ((Number) structured.get("credibility_score")).intValue();
            }
            if (score != null && score < 40) {
                blacklistService.blacklist(normalized, score, "structured", "credibility_score_below_threshold");
            }
            
            if (result == null || result.containsKey("error")) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "ML_SERVICE_ERROR");
                error.put("message", result != null && result.get("error") != null 
                    ? result.get("error").toString() 
                    : "ML service returned an error");
                return ResponseEntity.status(500).body(error);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Analysis completed successfully");
            // include structured if present
            if (structured != null && !structured.isEmpty()) {
                Map<String, Object> merged = new HashMap<>(result);
                merged.put("structured", structured);
                response.put("result", merged);
            } else {
                response.put("result", result);
            }
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "ML_SERVICE_UNAVAILABLE");
            error.put("message", "AI Service unavailable. Please ensure the Flask service is running on port 5000.");
            return ResponseEntity.status(503).body(error);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "HTTP_ERROR");
            error.put("message", "Error fetching URL content: " + e.getMessage());
            return ResponseEntity.status(e.getStatusCode().value()).body(error);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "RUNTIME_ERROR");
            error.put("message", e.getMessage() != null ? e.getMessage() : "An unexpected error occurred");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "INTERNAL_ERROR");
            error.put("message", "Analysis failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromImage(
            @RequestParam("file") MultipartFile file,
            @Nullable Authentication authentication
    ) {
        try {
            if (file == null || file.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Image file is required");
                return ResponseEntity.badRequest().body(error);
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "File must be an image");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = mlService.analyzeFakeNewsFromImage(file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Analysis completed successfully");
            response.put("result", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Analysis failed: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}

