package com.example.literature.conversation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ConversationMessageRepository extends JpaRepository<ConversationMessageEntity, String> {

    List<ConversationMessageEntity> findByConversationIdOrderBySequence(String conversationId);

    long countByConversationId(String conversationId);
}
