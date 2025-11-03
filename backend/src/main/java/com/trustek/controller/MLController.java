package com.trustek.controller;

import com.trustek.service.MLService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for ML service endpoints
 */
@RestController
@RequestMapping("/api/ml")
public class MLController {

    private final MLService mlService;

    public MLController(MLService mlService) {
        this.mlService = mlService;
    }

    @PostMapping("/fake-news")
    public ResponseEntity<Map<String, Object>> analyzeFakeNews(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        try {
            String text = request.get("text");
            if (text == null || text.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Text field is required");
                return ResponseEntity.badRequest().body(error);
            }

            // Get optional source URL
            String sourceUrl = request.get("sourceUrl");
            if (sourceUrl == null) {
                sourceUrl = request.get("url"); // Also check for "url" key for backward compatibility
            }

            Map<String, Object> result = mlService.analyzeFakeNews(text, sourceUrl);
            
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

    @PostMapping("/review")
    public ResponseEntity<Map<String, Object>> analyzeReview(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        try {
            String text = request.get("text");
            if (text == null || text.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Text field is required");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = mlService.analyzeReview(text);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Review analysis completed successfully");
            response.put("result", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> scanWebsite(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        try {
            String url = request.get("url");
            if (url == null || url.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "URL field is required");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = mlService.scanWebsite(url);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Website scan completed successfully");
            response.put("result", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkHealth(@org.springframework.lang.Nullable Authentication authentication) {
        try {
            Map<String, Object> result = mlService.checkHealth();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "unhealthy");
            error.put("error", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }
}

