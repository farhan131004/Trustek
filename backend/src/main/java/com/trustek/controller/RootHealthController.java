package com.trustek.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootHealthController {

    @GetMapping("/health")
    public Map<String, Object> healthCheck() {
        return Map.of(
                "status", "healthy",
                "message", "Backend service is running fine",
                "timestamp", System.currentTimeMillis()
        );
    }
}
