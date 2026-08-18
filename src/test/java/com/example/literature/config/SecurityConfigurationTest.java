package com.example.literature.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = "app.auth.required=true")
@ActiveProfiles("test")
class SecurityConfigurationTest {

    @Autowired
    private SecurityFilterChain securityFilterChain;

    @Test
    void startsJwtProtectedSecurityFilterChain() {
        assertThat(securityFilterChain).isNotNull();
    }
}
