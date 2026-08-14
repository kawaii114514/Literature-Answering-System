package com.example.literature.auth;

import com.example.literature.config.ApplicationProperties;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    private final JwtEncoder encoder;
    private final long ttlSeconds;

    public JwtTokenService(JwtEncoder encoder, ApplicationProperties properties) {
        this.encoder = encoder;
        this.ttlSeconds = properties.auth().tokenTtlSeconds();
    }

    public AuthService.AuthResponse issue(AppUser user) {
        Instant now = Instant.now();
        Instant expires = now.plus(ttlSeconds, ChronoUnit.SECONDS);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.id())
                .claim("username", user.username())
                .claim("display_name", user.displayName())
                .issuedAt(now)
                .expiresAt(expires)
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(
                org.springframework.security.oauth2.jwt.JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new AuthService.AuthResponse(token, "Bearer", expires,
                new AuthService.UserView(user.id(), user.username(), user.displayName()));
    }
}
