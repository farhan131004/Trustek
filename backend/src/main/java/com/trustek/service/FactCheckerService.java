package com.trustek.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Service to integrate with Python Fact-Checker API
 */
@Service
public class FactCheckerService {

    private final RestTemplate restTemplate;
    private final String factCheckerUrl;

    public FactCheckerService() {
        this.restTemplate = new RestTemplate();
        // Default to localhost:8000 where Python FastAPI server runs
        this.factCheckerUrl = "http://localhost:8000";
    }

    /**
     * Analyze news content using the Python fact-checker
     */
    public Map<String, Object> analyzeNews(String text, String sourceUrl) {
        try {
            String endpoint = factCheckerUrl + "/verify";
            
            // Prepare request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", text);
            if (sourceUrl != null && !sourceUrl.trim().isEmpty()) {
                requestBody.put("source_url", sourceUrl);
            }
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            // Make the request
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return enhanceResponse(response.getBody());
            } else {
                return createErrorResponse("Fact-checker service returned an error");
            }
            
        } catch (Exception e) {
            return createErrorResponse("Failed to connect to fact-checker service: " + e.getMessage());
        }
    }

    /**
     * Check if the Python fact-checker service is available
     */
    public Map<String, Object> checkFactCheckerHealth() {
        try {
            String endpoint = factCheckerUrl + "/";
            ResponseEntity<Map> response = restTemplate.getForEntity(endpoint, Map.class);
            
            Map<String, Object> result = new HashMap<>();
            result.put("status", "healthy");
            result.put("service", "Python Fact-Checker");
            result.put("endpoint", factCheckerUrl);
            return result;
            
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("status", "unhealthy");
            result.put("service", "Python Fact-Checker");
            result.put("endpoint", factCheckerUrl);
            result.put("error", e.getMessage());
            return result;
        }
    }

    /**
     * Enhance the response with additional metadata
     */
    private Map<String, Object> enhanceResponse(Map<String, Object> originalResponse) {
        Map<String, Object> enhanced = new HashMap<>(originalResponse);
        
        // Add metadata
        enhanced.put("service", "Python Fact-Checker");
        enhanced.put("timestamp", System.currentTimeMillis());
        enhanced.put("version", "1.0");
        
        // Extract key metrics for easy access
        Map<String, Object> summary = new HashMap<>();
        
        if (originalResponse.containsKey("final")) {
            Map<String, Object> finalResult = (Map<String, Object>) originalResponse.get("final");
            summary.put("verdict", finalResult.get("verdict"));
            summary.put("score", finalResult.get("score"));
        }
        
        if (originalResponse.containsKey("confidence_score")) {
            summary.put("confidence", originalResponse.get("confidence_score"));
        }
        
        if (originalResponse.containsKey("detailed_analysis")) {
            Map<String, Object> analysis = (Map<String, Object>) originalResponse.get("detailed_analysis");
            if (analysis.containsKey("source_credibility")) {
                Map<String, Object> credibility = (Map<String, Object>) analysis.get("source_credibility");
                summary.put("source_trust", credibility.get("source_trust_level"));
            }
        }
        
        enhanced.put("summary", summary);
        return enhanced;
    }

    /**
     * Create standardized error response
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", true);
        error.put("message", message);
        error.put("service", "Python Fact-Checker");
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }
}
