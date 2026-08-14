package com.example.literature.conversation;

import java.time.Instant;
import java.util.List;

public record ConversationSnapshot(
        String id,
        String spaceId,
        String title,
        Instant createdAt,
        Instant updatedAt,
        List<ConversationMessageView> messages) {

    public ConversationSnapshot {
        messages = List.copyOf(messages);
    }
}

