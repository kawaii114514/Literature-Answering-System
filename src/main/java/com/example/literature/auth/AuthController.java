package com.example.literature.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    public AuthService.AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request.username(), request.displayName(), request.password());
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.username(), request.password());
    }

    @GetMapping("/me")
    public AuthService.UserView me(Authentication authentication) {
        return auth.find(CurrentUser.id(authentication));
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Size(max = 200) String displayName,
            @NotBlank @Size(min = 8, max = 200) String password) {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }
}
