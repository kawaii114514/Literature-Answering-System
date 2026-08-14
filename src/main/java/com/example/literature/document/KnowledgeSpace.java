package com.example.literature.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "knowledge_space")
public class KnowledgeSpace {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "owner_user_id", nullable = false, length = 36)
    private String ownerUserId;

    @Column(name = "group_id", length = 36)
    private String groupId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected KnowledgeSpace() {
    }

    public KnowledgeSpace(String name, String ownerUserId, String groupId) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.ownerUserId = ownerUserId;
        this.groupId = groupId;
        this.createdAt = Instant.now();
    }

    public String id() {
        return id;
    }

    public String ownerUserId() { return ownerUserId; }
    public String groupId() { return groupId; }
    public String name() { return name; }
    public Instant createdAt() { return createdAt; }
}
