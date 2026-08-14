package com.example.literature.conversation;

import java.util.List;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JpaConversationHistoryStore implements ConversationHistoryStore {

    private final ConversationRepository conversations;
    private final ConversationMessageRepository messages;

    public JpaConversationHistoryStore(
            ConversationRepository conversations,
            ConversationMessageRepository messages) {
        this.conversations = conversations;
        this.messages = messages;
    }

    @Override
    @Transactional
    public ConversationSnapshot create(String spaceId, String title) {
        return snapshot(conversations.save(new ConversationEntity(spaceId, title)), List.of());
    }

    @Override
    @Transactional
    public ConversationSnapshot append(
            String spaceId, String conversationId, MessageRole role, String content) {
        ConversationEntity conversation = conversations.findLockedByIdAndSpaceId(conversationId, spaceId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
        int sequence = Math.toIntExact(messages.countByConversationId(conversationId) + 1);
        messages.save(new ConversationMessageEntity(conversationId, sequence, role, content));
        conversation.touch();
        conversations.save(conversation);
        return load(spaceId, conversationId);
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationSnapshot load(String spaceId, String conversationId) {
        ConversationEntity conversation = find(spaceId, conversationId);
        return snapshot(conversation, messages.findByConversationIdOrderBySequence(conversationId));
    }

    private ConversationEntity find(String spaceId, String conversationId) {
        return conversations.findByIdAndSpaceId(conversationId, spaceId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
    }

    private static ConversationSnapshot snapshot(
            ConversationEntity conversation, List<ConversationMessageEntity> messages) {
        return new ConversationSnapshot(
                conversation.id(), conversation.spaceId(), conversation.title(),
                conversation.createdAt(), conversation.updatedAt(),
                messages.stream().map(ConversationMessageEntity::view).toList());
    }
}
