package com.trustek.controller;

import com.trustek.service.MLService;
import com.trustek.service.FactCheckerService;
import com.trustek.service.BlacklistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for ML service endpoints
 */
@RestController
@RequestMapping("/api/ml")
public class MLController {

    private final MLService mlService;
    private final FactCheckerService factCheckerService;
    private final BlacklistService blacklistService;

    public MLController(MLService mlService, FactCheckerService factCheckerService, BlacklistService blacklistService) {
        this.mlService = mlService;
        this.factCheckerService = factCheckerService;
        this.blacklistService = blacklistService;
    }

    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> getSitePreview(
            @RequestParam(name = "url", required = true) String url,
            Authentication authentication
    ) {
        try {
            if (url == null || url.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "URL query parameter is required");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = mlService.getSitePreview(url.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Preview fetched successfully");
            response.put("result", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> postSitePreview(
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

            Map<String, Object> result = mlService.getSitePreview(url.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Preview fetched successfully");
            response.put("result", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping(value = "/analyze-image", consumes = {"multipart/form-data"})
    public ResponseEntity<Map<String, Object>> analyzeImage(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "max_results", required = false) Integer maxResults,
            Authentication authentication
    ) {
        try {
            if (file == null || file.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Image file is required");
                return ResponseEntity.badRequest().body(error);
            }

            Map<String, Object> result = mlService.analyzeFakeNewsFromImage(file, maxResults);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Image analyzed successfully");
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
            error.put("message", "Image analysis failed: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
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

            String trimmed = url.trim();

            // Block if already blacklisted
            if (blacklistService.isBlacklisted(trimmed)) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "URL is blacklisted due to low credibility");
                BlacklistService.Entry entry = blacklistService.get(trimmed);
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

            // Run lightweight scan
            Map<String, Object> basicScan = mlService.scanWebsite(trimmed);

            // Get structured credibility score
            Map<String, Object> structured = new HashMap<>();
            try {
                structured = mlService.analyzeStructuredUrl(trimmed);
            } catch (RuntimeException ex) {
                // proceed without structured if unavailable
            }

            Integer score = null;
            if (structured != null && structured.get("credibility_score") instanceof Number) {
                score = ((Number) structured.get("credibility_score")).intValue();
            }

            // Call fact-checker with URL as source (text optional)
            Map<String, Object> factCheck = new HashMap<>();
            try {
                factCheck = factCheckerService.analyzeNews("", trimmed);
            } catch (Exception ignored) {}

            // Auto-blacklist if score < 40
            if (score != null && score < 40) {
                blacklistService.blacklist(trimmed, score, "structured", "credibility_score_below_threshold");
            }

            Map<String, Object> result = new HashMap<>();
            result.put("url", trimmed);
            result.put("ml_scan", basicScan);
            if (structured != null) result.put("structured", structured);
            if (factCheck != null && !factCheck.isEmpty()) result.put("fact_checker", factCheck);

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

    @PostMapping("/fact-check")
    public ResponseEntity<Map<String, Object>> detailedFactCheck(
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

            String sourceUrl = request.get("sourceUrl");
            if (sourceUrl == null) {
                sourceUrl = request.get("url"); // Also check for "url" key for backward compatibility
            }

            Map<String, Object> result = factCheckerService.analyzeNews(text, sourceUrl);
            
            if (result.containsKey("error")) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", result.get("message"));
                return ResponseEntity.status(503).body(error);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Detailed fact-check completed successfully");
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
            error.put("message", "Fact-check failed: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkHealth(@org.springframework.lang.Nullable Authentication authentication) {
        try {
            Map<String, Object> result = mlService.checkHealth();
            
            // Also check fact-checker service health
            Map<String, Object> factCheckerHealth = factCheckerService.checkFactCheckerHealth();
            result.put("fact_checker", factCheckerHealth);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "unhealthy");
            error.put("error", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }
}

