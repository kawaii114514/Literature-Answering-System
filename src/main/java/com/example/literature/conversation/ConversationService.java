package com.example.literature.conversation;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ConversationService {

    private final ConversationHistoryStore history;
    private final ConversationCache cache;

    public ConversationService(ConversationHistoryStore history, ConversationCache cache) {
        this.history = history;
        this.cache = cache;
    }

    public ConversationSnapshot create(String spaceId, String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Conversation title must not be blank");
        }
        ConversationSnapshot snapshot = history.create(spaceId, title.strip());
        cache.save(snapshot);
        return snapshot;
    }

    public ConversationSnapshot append(
            String spaceId, String conversationId, MessageRole role, String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content must not be blank");
        }
        ConversationSnapshot snapshot = history.append(spaceId, conversationId, role, content.strip());
        cache.save(snapshot);
        return snapshot;
    }

    public ConversationSnapshot restore(String spaceId, String conversationId) {
        return cache.find(spaceId, conversationId).orElseGet(() -> {
            ConversationSnapshot snapshot = history.load(spaceId, conversationId);
            cache.save(snapshot);
            return snapshot;
        });
    }

    public List<ConversationSummary> list(String spaceId) {
        return history.list(spaceId);
    }
}

