package com.example.literature.conversation;

import java.util.Optional;

public interface ConversationCache {

    Optional<ConversationSnapshot> find(String spaceId, String conversationId);

    void save(ConversationSnapshot snapshot);
}

