package com.example.literature.retrieval;

import com.example.literature.config.ApplicationProperties;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class HybridEvidenceRetriever {

    private static final int RRF_K = 60;

    private final EvidenceRetriever vector;
    private final KeywordEvidenceRetriever keyword;
    private final Reranker reranker;
    private final int candidateMultiplier;
    private final double minScore;

    public HybridEvidenceRetriever(
            EvidenceRetriever vector,
            KeywordEvidenceRetriever keyword,
            Reranker reranker,
            ApplicationProperties properties) {
        this.vector = vector;
        this.keyword = keyword;
        this.reranker = reranker;
        this.candidateMultiplier = properties.retrieval().candidateMultiplier();
        this.minScore = properties.retrieval().minScore();
    }

    public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit, RetrievalStrategy strategy) {
        return retrieveDetailed(spaceId, query, limit, strategy).results();
    }

    public HybridResult retrieveDetailed(String spaceId, String query, int limit, RetrievalStrategy strategy) {
        if (strategy == RetrievalStrategy.VECTOR) {
            return new HybridResult(vector.retrieve(spaceId, query, limit), 0, 0, 0);
        }
        int candidateLimit = Math.min(200, Math.max(20, limit * candidateMultiplier));
        List<RetrievedEvidence> vectorResults = vector.retrieve(spaceId, query, candidateLimit);
        List<RetrievedEvidence> keywordResults = keyword.retrieve(spaceId, query, candidateLimit);
        boolean vectorSupported = vectorResults.stream().anyMatch(item -> item.score() >= minScore);
        if (keywordResults.isEmpty() && !vectorSupported) {
            return new HybridResult(List.of(), 0, 0, 0);
        }
        long fusionStarted = System.nanoTime();
        Map<String, ScoredEvidence> fused = new LinkedHashMap<>();
        addRanked(fused, vectorResults);
        addRanked(fused, keywordResults);
        List<RetrievedEvidence> candidates = fused.values().stream()
                .sorted(Comparator.comparingDouble(ScoredEvidence::score).reversed())
                .map(item -> withScore(item.evidence(), item.score()))
                .toList();
        long fusionMillis = elapsedMillis(fusionStarted);
        if (strategy == RetrievalStrategy.HYBRID_RERANK) {
            long rerankStarted = System.nanoTime();
            List<RetrievedEvidence> reranked = reranker.rerank(query, candidates, limit).stream()
                    .filter(item -> item.score() >= minScore)
                    .toList();
            return new HybridResult(reranked, candidates.size(), fusionMillis, elapsedMillis(rerankStarted));
        }
        return new HybridResult(candidates.stream().limit(limit).toList(), candidates.size(), fusionMillis, 0);
    }

    private static RetrievedEvidence withScore(RetrievedEvidence item, double score) {
        return new RetrievedEvidence(item.citationNumber(), item.passageId(), item.documentId(),
                item.documentTitle(), item.pageStart(), item.pageEnd(), item.excerpt(), score);
    }

    private static void addRanked(Map<String, ScoredEvidence> fused, List<RetrievedEvidence> results) {
        for (int index = 0; index < results.size(); index++) {
            RetrievedEvidence evidence = results.get(index);
            int rank = index + 1;
            fused.compute(evidence.passageId(), (id, current) -> {
                double score = (current == null ? 0.0 : current.score()) + 1.0 / (RRF_K + rank);
                return new ScoredEvidence(evidence, score);
            });
        }
    }

    private record ScoredEvidence(RetrievedEvidence evidence, double score) {
    }

    private static long elapsedMillis(long started) {
        return java.time.Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    public record HybridResult(List<RetrievedEvidence> results, int candidateCount,
            long fusionDurationMs, long rerankDurationMs) {
    }
}
