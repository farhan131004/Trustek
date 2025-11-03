package com.trustek.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration("backendAppConfig2")
public class BackendAppConfig2 {
    @Bean(name = "backendRestTemplate2")
    public RestTemplate backendRestTemplate2(RestTemplateBuilder builder) {
        return builder.build();
    }
}
