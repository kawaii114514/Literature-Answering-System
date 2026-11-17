package com.example.literature.conversation;

import java.util.List;

public interface ConversationHistoryStore {

    ConversationSnapshot create(String spaceId, String title);

    ConversationSnapshot append(String spaceId, String conversationId, MessageRole role, String content);

    ConversationSnapshot load(String spaceId, String conversationId);

    List<ConversationSummary> list(String spaceId);
}

