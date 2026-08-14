package com.example.literature.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "research_group")
public class ResearchGroup {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "owner_user_id", nullable = false, length = 36)
    private String ownerUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ResearchGroup() {
    }

    public ResearchGroup(String name, String ownerUserId) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.ownerUserId = ownerUserId;
        this.createdAt = Instant.now();
    }

    public String id() { return id; }
    public String name() { return name; }
    public String ownerUserId() { return ownerUserId; }
    public Instant createdAt() { return createdAt; }
}
