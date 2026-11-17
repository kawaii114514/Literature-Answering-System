package com.example.literature.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ConversationServiceTest {

    @Test
    void restoresDurableHistoryWhenCacheMissesThenWarmsCache() {
        ConversationSnapshot durable = new ConversationSnapshot(
                "conversation-1",
                "space-1",
                "How does hybrid retrieval work?",
                Instant.parse("2026-08-14T00:00:00Z"),
                Instant.parse("2026-08-14T00:01:00Z"),
                List.of(new ConversationMessageView(
                        "message-1", 1, MessageRole.USER, "Explain hybrid retrieval",
                        Instant.parse("2026-08-14T00:01:00Z"))));
        StubHistoryStore store = new StubHistoryStore(durable);
        RecordingCache cache = new RecordingCache();
        ConversationService service = new ConversationService(store, cache);

        ConversationSnapshot restored = service.restore("space-1", "conversation-1");

        assertThat(restored).isEqualTo(durable);
        assertThat(store.loads).isEqualTo(1);
        assertThat(cache.saved).containsExactly(durable);
    }

    @Test
    void returnsCachedHistoryWithoutLoadingDurableStore() {
        ConversationSnapshot cached = new ConversationSnapshot(
                "conversation-1", "space-1", "Cached", Instant.EPOCH, Instant.EPOCH, List.of());
        StubHistoryStore store = new StubHistoryStore(null);
        RecordingCache cache = new RecordingCache();
        cache.current = cached;
        ConversationService service = new ConversationService(store, cache);

        assertThat(service.restore("space-1", "conversation-1")).isEqualTo(cached);
        assertThat(store.loads).isZero();
    }

    @Test
    void listsConversationSummariesFromDurableStore() {
        StubHistoryStore store = new StubHistoryStore(null);
        ConversationSummary summary = new ConversationSummary(
                "conversation-1", "space-1", "Hybrid retrieval notes",
                Instant.EPOCH, Instant.parse("2026-08-14T00:01:00Z"), 4);
        store.summaries = List.of(summary);
        ConversationService service = new ConversationService(store, new RecordingCache());

        assertThat(service.list("space-1")).containsExactly(summary);
        assertThat(store.loads).isZero();
    }

    private static final class StubHistoryStore implements ConversationHistoryStore {
        private final ConversationSnapshot snapshot;
        private List<ConversationSummary> summaries = List.of();
        private int loads;

        private StubHistoryStore(ConversationSnapshot snapshot) {
            this.snapshot = snapshot;
        }

        @Override
        public ConversationSnapshot create(String spaceId, String title) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ConversationSnapshot append(String spaceId, String conversationId, MessageRole role, String content) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ConversationSnapshot load(String spaceId, String conversationId) {
            loads++;
            return snapshot;
        }

        @Override
        public List<ConversationSummary> list(String spaceId) {
            return summaries;
        }
    }

    private static final class RecordingCache implements ConversationCache {
        private ConversationSnapshot current;
        private final List<ConversationSnapshot> saved = new ArrayList<>();

        @Override
        public Optional<ConversationSnapshot> find(String spaceId, String conversationId) {
            return Optional.ofNullable(current);
        }

        @Override
        public void save(ConversationSnapshot snapshot) {
            saved.add(snapshot);
            current = snapshot;
        }
    }
}
