package com.example.literature.conversation;

import java.time.Instant;

public record ConversationMessageView(
        String id,
        int sequence,
        MessageRole role,
        String content,
        Instant createdAt) {
}

