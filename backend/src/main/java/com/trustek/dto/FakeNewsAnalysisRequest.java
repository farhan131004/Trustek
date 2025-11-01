package com.trustek.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for fake news analysis request
 */
public class FakeNewsAnalysisRequest {
    
    @NotBlank(message = "Text is required")
    private String text;
    
    // Getters and Setters
    public String getText() {
        return text;
    }
    
    public void setText(String text) {
        this.text = text;
    }
}

