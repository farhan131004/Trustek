package com.trustek.dto;

/**
 * DTO for fake news analysis response
 */
public class FakeNewsAnalysisResponse {
    private String verdict;
    private Double confidence;
    
    // Constructors
    public FakeNewsAnalysisResponse() {}
    
    public FakeNewsAnalysisResponse(String verdict, Double confidence) {
        this.verdict = verdict;
        this.confidence = confidence;
    }
    
    // Getters and Setters
    public String getVerdict() {
        return verdict;
    }
    
    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }
    
    public Double getConfidence() {
        return confidence;
    }
    
    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }
}

