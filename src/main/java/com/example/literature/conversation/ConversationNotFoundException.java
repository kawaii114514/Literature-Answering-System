package com.example.literature.conversation;

public final class ConversationNotFoundException extends RuntimeException {

    public ConversationNotFoundException(String conversationId) {
        super("Conversation not found: " + conversationId);
    }
}

