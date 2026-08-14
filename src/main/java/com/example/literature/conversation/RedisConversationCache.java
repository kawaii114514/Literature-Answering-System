package com.example.literature.conversation;

import com.example.literature.config.ApplicationProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RedisConversationCache implements ConversationCache {

    private static final Logger log = LoggerFactory.getLogger(RedisConversationCache.class);
    private static final String PREFIX = "literature:conversation:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final Duration ttl;

    public RedisConversationCache(
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            ApplicationProperties properties) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.ttl = Duration.ofMinutes(properties.conversation().cacheTtlMinutes());
    }

    @Override
    public Optional<ConversationSnapshot> find(String spaceId, String conversationId) {
        try {
            String value = redis.opsForValue().get(key(spaceId, conversationId));
            return value == null ? Optional.empty()
                    : Optional.of(objectMapper.readValue(value, ConversationSnapshot.class));
        } catch (DataAccessException exception) {
            log.warn("Redis unavailable; restoring conversation from MySQL: {}", exception.getMessage());
            return Optional.empty();
        } catch (JsonProcessingException exception) {
            log.warn("Discarding unreadable conversation cache entry: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void save(ConversationSnapshot snapshot) {
        try {
            redis.opsForValue().set(
                    key(snapshot.spaceId(), snapshot.id()), objectMapper.writeValueAsString(snapshot), ttl);
        } catch (DataAccessException exception) {
            log.warn("Redis unavailable; conversation remains durable in MySQL: {}", exception.getMessage());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize conversation snapshot", exception);
        }
    }

    private static String key(String spaceId, String conversationId) {
        return PREFIX + spaceId + ":" + conversationId;
    }
}
