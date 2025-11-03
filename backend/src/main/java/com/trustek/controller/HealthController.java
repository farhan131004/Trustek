package com.trustek.controller;

import com.trustek.service.MLService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * Health check controller for monitoring backend and ML service status
 */
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api")
public class HealthController {

    private final MLService mlService;

    public HealthController(MLService mlService) {
        this.mlService = mlService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "trustek-backend");
        response.put("timestamp", System.currentTimeMillis());

        try {
            Map<String, Object> mlHealth = mlService.checkHealth();

            if (mlHealth != null) {
                response.put("ml_service", mlHealth);

                // Set status based on ML service response
                if ("healthy".equalsIgnoreCase((String) mlHealth.get("status"))) {
                    response.put("status", "healthy");
                } else {
                    response.put("status", "degraded");
                }
            } else {
                response.put("ml_service", Map.of(
                    "status", "unreachable",
                    "error", "No response from ML service"
                ));
                response.put("status", "degraded");
            }

        } catch (Exception e) {
            response.put("ml_service", Map.of(
                "status", "unhealthy",
                "error", e.getMessage()
            ));
            response.put("status", "degraded");
        }

        return ResponseEntity.ok(response);
    }
}
