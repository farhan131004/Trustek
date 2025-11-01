package com.trustek.controller;

import com.trustek.dto.FakeNewsAnalysisRequest;
import com.trustek.dto.FakeNewsAnalysisResponse;
import com.trustek.service.FakeNewsService;
import com.trustek.service.MLService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for fake news analysis endpoints
 */
@RestController
@RequestMapping("/api/fake-news")
public class FakeNewsController {

    private final FakeNewsService fakeNewsService;
    private final MLService mlService;
    
    public FakeNewsController(FakeNewsService fakeNewsService, MLService mlService) {
        this.fakeNewsService = fakeNewsService;
        this.mlService = mlService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeFakeNews(
            @Valid @RequestBody FakeNewsAnalysisRequest request,
            Authentication authentication
    ) {
        try {
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

            Map<String, Object> result = mlService.analyzeFakeNewsFromUrl(url.trim());
            
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

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> analyzeFakeNewsFromImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
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

