package com.example.literature.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.literature.config.ApplicationProperties;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class HybridEvidenceRetrieverTest {

    @Test
    void fusesVectorAndKeywordRanksWithoutDuplicatePassages() {
        EvidenceRetriever vector = (space, query, limit) -> List.of(
                evidence("a", 0.9), evidence("b", 0.8));
        KeywordEvidenceRetriever keyword = (space, query, limit) -> List.of(
                evidence("b", 2.0), evidence("c", 1.0));
        Reranker reranker = (query, candidates, limit) -> candidates;
        HybridEvidenceRetriever hybrid = new HybridEvidenceRetriever(vector, keyword, reranker, properties());

        List<RetrievedEvidence> results = hybrid.retrieve("space", "query", 3, RetrievalStrategy.HYBRID_RRF);

        assertThat(results).extracting(RetrievedEvidence::passageId)
                .containsExactly("b", "a", "c");
        assertThat(results).extracting(RetrievedEvidence::score)
                .isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }

    private static RetrievedEvidence evidence(String id, double score) {
        return new RetrievedEvidence(0, id, "document", "", 1, 1, id + " text", score);
    }

    private static ApplicationProperties properties() {
        return new ApplicationProperties(
                new ApplicationProperties.Storage(Path.of("target/uploads"), Path.of("target/lucene")),
                new ApplicationProperties.Documents(50_000_000, 500, 1200, 200),
                new ApplicationProperties.Retrieval(0.65, 4, "HYBRID_RRF"),
                new ApplicationProperties.Conversation(30),
                new ApplicationProperties.Auth("test-secret-that-is-at-least-32-bytes-long", 3600, false),
                new ApplicationProperties.Reranker("http://localhost:8000", "", "test", 1000, false));
    }
}
