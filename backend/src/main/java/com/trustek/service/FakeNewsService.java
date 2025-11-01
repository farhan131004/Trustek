package com.trustek.service;

import com.trustek.dto.FakeNewsAnalysisRequest;
import com.trustek.dto.FakeNewsAnalysisResponse;
import com.trustek.entity.AnalysisHistory;
import com.trustek.entity.User;
import com.trustek.repository.AnalysisHistoryRepository;
import com.trustek.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for fake news detection and analysis
 */
@Service
public class FakeNewsService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final AnalysisHistoryRepository analysisHistoryRepository;

    @Value("${ml.service.url}")
    private String mlServiceUrl;
    
    public FakeNewsService(RestTemplate restTemplate, UserRepository userRepository, AnalysisHistoryRepository analysisHistoryRepository) {
        this.restTemplate = restTemplate;
        this.userRepository = userRepository;
        this.analysisHistoryRepository = analysisHistoryRepository;
    }

    @Transactional
    public FakeNewsAnalysisResponse analyzeFakeNews(String userEmail, FakeNewsAnalysisRequest request) {
        // Call Python ML service
        FakeNewsAnalysisResponse mlResponse = callMLService(request);

        // Save analysis history
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AnalysisHistory history = new AnalysisHistory();
        history.setUser(user);
        history.setInputText(request.getText());
        history.setVerdict(mlResponse.getVerdict());
        history.setConfidence(mlResponse.getConfidence());
        
        analysisHistoryRepository.save(history);

        return mlResponse;
    }

    private FakeNewsAnalysisResponse callMLService(FakeNewsAnalysisRequest request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("text", request.getText());

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<FakeNewsAnalysisResponse> response = restTemplate.postForEntity(
                    mlServiceUrl + "/analyze",
                    entity,
                    FakeNewsAnalysisResponse.class
            );

            return response.getBody();
        } catch (Exception e) {
            // Fallback response if ML service is unavailable
            throw new RuntimeException("ML service unavailable: " + e.getMessage());
        }
    }
}

