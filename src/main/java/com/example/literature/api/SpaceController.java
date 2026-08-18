package com.example.literature.api;

import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.MemberRole;
import com.example.literature.auth.SpaceService;
import com.example.literature.document.KnowledgeSpace;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
    public SpaceView create(@Valid @RequestBody CreateSpace request, Authentication authentication) {
        return SpaceView.from(
                spaces.create(CurrentUser.id(authentication), request.name(), request.groupId()), MemberRole.OWNER);
    }

    @GetMapping
    public List<SpaceView> list(Authentication authentication) {
        return spaces.list(CurrentUser.id(authentication)).stream()
                .map(accessible -> SpaceView.from(accessible.space(), accessible.role()))
                .toList();
    }

    public record CreateSpace(@NotBlank @Size(max = 200) String name, String groupId) { }

    public record SpaceView(
            String id,
            String ownerUserId,
            String groupId,
            String name,
            Instant createdAt,
            MemberRole role) {

        static SpaceView from(KnowledgeSpace space, MemberRole role) {
            return new SpaceView(
                    space.id(), space.ownerUserId(), space.groupId(), space.name(), space.createdAt(), role);
        }
    }
}
