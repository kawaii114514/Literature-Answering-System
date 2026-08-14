package com.example.literature.api;

import com.example.literature.conversation.ConversationService;
import com.example.literature.conversation.ConversationSnapshot;
import com.example.literature.conversation.MessageRole;
import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.SpaceAuthorizationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/spaces/{spaceId}/conversations")
public class ConversationController {

    private final ConversationService conversations;
    private final SpaceAuthorizationService authorization;

    public ConversationController(ConversationService conversations, SpaceAuthorizationService authorization) {
        this.conversations = conversations;
        this.authorization = authorization;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationSnapshot create(
            @PathVariable String spaceId, @Valid @RequestBody CreateConversation request,
            Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        return conversations.create(spaceId, request.title());
    }

    @PostMapping("/{conversationId}/messages")
    public ConversationSnapshot append(
            @PathVariable String spaceId,
            @PathVariable String conversationId,
            @Valid @RequestBody AppendMessage request, Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        return conversations.append(spaceId, conversationId, request.role(), request.content());
    }

    @GetMapping("/{conversationId}")
    public ConversationSnapshot restore(
            @PathVariable String spaceId, @PathVariable String conversationId,
            Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        return conversations.restore(spaceId, conversationId);
    }

    public record CreateConversation(@NotBlank @Size(max = 300) String title) {
    }

    public record AppendMessage(@NotNull MessageRole role, @NotBlank @Size(max = 100_000) String content) {
    }
}
