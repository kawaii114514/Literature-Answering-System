package com.example.literature.auth;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "space_member")
public class SpaceMembership {

    @EmbeddedId
    private Id id;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 20)
    private MemberRole memberRole;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SpaceMembership() {
    }

    public SpaceMembership(String spaceId, String userId, MemberRole role) {
        this.id = new Id(spaceId, userId);
        this.memberRole = role;
        this.createdAt = Instant.now();
    }

    public MemberRole memberRole() { return memberRole; }

    public record Id(
            @Column(name = "space_id", length = 36) String spaceId,
            @Column(name = "user_id", length = 36) String userId) implements Serializable {
    }
}
