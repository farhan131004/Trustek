package com.trustek.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for authentication response
 */
@Data
@NoArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private UserResponse user;
    
    public AuthResponse(String accessToken, String refreshToken, String tokenType, UserResponse user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType == null ? "Bearer" : tokenType;
        this.user = user;
    }
}

