package com.example.literature.conversation;

import java.time.Instant;

public record ConversationSummary(
        String id,
        String spaceId,
        String title,
        Instant createdAt,
        Instant updatedAt,
        int messageCount) {
}
