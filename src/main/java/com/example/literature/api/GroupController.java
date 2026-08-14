package com.example.literature.api;

import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.GroupService;
import com.example.literature.auth.MemberRole;
import com.example.literature.auth.ResearchGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {
    private final GroupService groups;

    public GroupController(GroupService groups) { this.groups = groups; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResearchGroup create(@Valid @RequestBody CreateGroup request, Authentication authentication) {
        return groups.create(CurrentUser.id(authentication), request.name());
    }

    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMember(@PathVariable String groupId, @Valid @RequestBody AddMember request,
            Authentication authentication) {
        groups.addMember(CurrentUser.id(authentication), groupId, request.userId(), request.role());
    }

    public record CreateGroup(@NotBlank @Size(max = 200) String name) { }
    public record AddMember(@NotBlank String userId, @NotNull MemberRole role) { }
}
