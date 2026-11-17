package com.example.literature.conversation;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

interface ConversationRepository extends JpaRepository<ConversationEntity, String> {

    Optional<ConversationEntity> findByIdAndSpaceId(String id, String spaceId);

    List<ConversationEntity> findBySpaceIdOrderByUpdatedAtDesc(String spaceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ConversationEntity> findLockedByIdAndSpaceId(String id, String spaceId);
}
