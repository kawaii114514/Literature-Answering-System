package com.example.literature.conversation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation")
class ConversationEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "space_id", nullable = false, length = 36)
    private String spaceId;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected ConversationEntity() {
    }

    ConversationEntity(String spaceId, String title) {
        id = UUID.randomUUID().toString();
        this.spaceId = spaceId;
        this.title = title;
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    void touch() { updatedAt = Instant.now(); }
    String id() { return id; }
    String spaceId() { return spaceId; }
    String title() { return title; }
    Instant createdAt() { return createdAt; }
    Instant updatedAt() { return updatedAt; }
}

