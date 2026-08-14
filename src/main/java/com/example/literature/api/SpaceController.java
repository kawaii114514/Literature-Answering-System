package com.example.literature.api;

import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.SpaceService;
import com.example.literature.document.KnowledgeSpace;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/spaces")
public class SpaceController {
    private final SpaceService spaces;

    public SpaceController(SpaceService spaces) { this.spaces = spaces; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public KnowledgeSpace create(@Valid @RequestBody CreateSpace request, Authentication authentication) {
        return spaces.create(CurrentUser.id(authentication), request.name(), request.groupId());
    }

    public record CreateSpace(@NotBlank @Size(max = 200) String name, String groupId) { }
}
