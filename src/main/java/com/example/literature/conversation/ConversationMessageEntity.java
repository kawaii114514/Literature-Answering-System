package com.example.literature.conversation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_message")
class ConversationMessageEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "conversation_id", nullable = false, length = 36)
    private String conversationId;

    @Column(name = "sequence_no", nullable = false)
    private int sequence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageRole role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ConversationMessageEntity() {
    }

    ConversationMessageEntity(String conversationId, int sequence, MessageRole role, String content) {
        id = UUID.randomUUID().toString();
        this.conversationId = conversationId;
        this.sequence = sequence;
        this.role = role;
        this.content = content;
        createdAt = Instant.now();
    }

    ConversationMessageView view() {
        return new ConversationMessageView(id, sequence, role, content, createdAt);
    }
}
