package com.trustek.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for communicating with Python ML Microservice
 */
@Service
public class MLService {

    private final RestTemplate restTemplate;

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    public MLService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Analyze text for fake news detection with optional source URL verification
     * 
     * @param text The text to analyze
     * @param sourceUrl Optional source URL to verify
     * @return Response containing label, confidence, source_status, and source_summary
     */
    public Map<String, Object> analyzeFakeNews(String text, String sourceUrl) {
        // Try unified endpoint first (preferred)
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("text", text);
            if (sourceUrl != null && !sourceUrl.trim().isEmpty()) {
                body.put("url", sourceUrl.trim());
            }

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/analyze-news",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            Map<String, Object> result = response.getBody();
            if (result != null && !result.containsKey("error")) {
                return result;
            }
        } catch (Exception e) {
            // Fall back to separate calls if unified endpoint fails
            // This ensures backward compatibility
        }

        // Fallback: Call endpoints separately
        Map<String, Object> combinedResult = new HashMap<>();
        
        // 1. Fake news detection
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("text", text);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/fake-news",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            Map<String, Object> fakeNewsResult = response.getBody();
            if (fakeNewsResult != null) {
                combinedResult.put("label", fakeNewsResult.get("label"));
                combinedResult.put("confidence", fakeNewsResult.get("confidence"));
            } else {
                combinedResult.put("label", "Real");
                combinedResult.put("confidence", 0.0);
            }
        } catch (Exception e) {
            combinedResult.put("label", "Real");
            combinedResult.put("confidence", 0.0);
            combinedResult.put("fake_news_error", "Fake news analysis failed: " + e.getMessage());
        }

        // 2. Source verification (if URL provided)
        if (sourceUrl != null && !sourceUrl.trim().isEmpty()) {
            try {
                Map<String, Object> scanResult = scanWebsite(sourceUrl.trim());
                if (scanResult != null && scanResult.containsKey("status")) {
                    String status = (String) scanResult.get("status");
                    String summary = (String) scanResult.getOrDefault("summary", "");
                    
                    // Map "Safe"/"Suspicious" to source_status format
                    combinedResult.put("source_status", status);
                    combinedResult.put("source_summary", summary);
                } else {
                    combinedResult.put("source_status", "Suspicious");
                    combinedResult.put("source_summary", "Source verification returned invalid response");
                }
            } catch (Exception e) {
                combinedResult.put("source_status", "Suspicious");
                combinedResult.put("source_summary", "Source verification failed: " + e.getMessage());
            }
        } else {
            combinedResult.put("source_status", "Unverified");
            combinedResult.put("source_summary", "No source URL provided");
        }

        return combinedResult;
    }

    /**
     * Analyze text for fake news detection (backward compatibility - no URL)
     * 
     * @param text The text to analyze
     * @return Response containing label (Fake/Real), confidence, source_status, and source_summary
     */
    public Map<String, Object> analyzeFakeNews(String text) {
        return analyzeFakeNews(text, null);
    }

    /**
     * Analyze text for sentiment (reviews)
     * 
     * @param text The review text to analyze
     * @return Response containing sentiment (Positive/Negative) and confidence
     */
    public Map<String, Object> analyzeReview(String text) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("text", text);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/review",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Sentiment analysis failed: " + e.getMessage());
        }
    }

    /**
     * Scan a website URL for safety
     * 
     * @param url The URL to scan
     * @return Response containing status (Safe/Suspicious) and summary
     */
    public Map<String, Object> scanWebsite(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("url", url);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/scan",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Website scan failed: " + e.getMessage());
        }
    }

    /**
     * Analyze fake news from a URL by extracting text and analyzing it
     * 
     * @param url The URL to analyze
     * @return Response containing detected_text, label, confidence, source_status, and source_summary
     */
    public Map<String, Object> analyzeFakeNewsFromUrl(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("url", url);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/analyze-url",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("URL analysis failed: " + e.getMessage());
        }
    }

    /**
     * Analyze fake news from an uploaded image using OCR and fake news detection
     * 
     * @param file The image file to analyze
     * @return Response containing detected_text, label, and confidence
     */
    public Map<String, Object> analyzeFakeNewsFromImage(MultipartFile file) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            // Create multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            
            // Convert MultipartFile to ByteArrayResource
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            
            body.add("file", resource);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    mlServiceUrl + "/analyze-image",
                    entity,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Image analysis failed: " + e.getMessage());
        }
    }

    /**
     * Check if ML service is healthy
     * 
     * @return Health status
     */
    public Map<String, Object> checkHealth() {
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.getForEntity(
                    mlServiceUrl + "/health",
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            return response.getBody();
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "unhealthy");
            error.put("error", e.getMessage());
            return error;
        }
    }
}

