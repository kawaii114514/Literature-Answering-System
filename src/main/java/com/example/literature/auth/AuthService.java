package com.example.literature.auth;

import com.example.literature.config.ApplicationProperties;
import java.time.Instant;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokenService tokens;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtTokenService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
    }

    @Transactional
    public AuthResponse register(String username, String displayName, String password) {
        if (users.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username is already registered");
        }
        AppUser user = users.save(new AppUser(username.strip(), displayName.strip(), passwords.encode(password)));
        return tokens.issue(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String username, String password) {
        AppUser user = users.findByUsername(username)
                .filter(AppUser::enabled)
                .filter(candidate -> candidate.passwordHash() != null
                        && passwords.matches(password, candidate.passwordHash()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));
        return tokens.issue(user);
    }

    @Transactional(readOnly = true)
    public UserView find(String userId) {
        AppUser user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new UserView(user.id(), user.username(), user.displayName());
    }

    public record AuthResponse(String accessToken, String tokenType, Instant expiresAt, UserView user) {
    }

    public record UserView(String id, String username, String displayName) {
    }
}
