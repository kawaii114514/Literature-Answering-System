package com.example.literature.retrieval;

import com.example.literature.document.LiteratureDocument;
import com.example.literature.document.LiteratureDocumentRepositoryAccess;
import java.util.List;

public final class RetrievalService {

    private final EvidenceRetriever retriever;
    private final HybridEvidenceRetriever hybrid;
    private final LiteratureDocumentRepositoryAccess documents;
    private final double minScore;

    public RetrievalService(
            EvidenceRetriever retriever,
            LiteratureDocumentRepositoryAccess documents,
            double minScore) {
        this(retriever, documents, minScore, null);
    }

    public RetrievalService(
            EvidenceRetriever retriever,
            LiteratureDocumentRepositoryAccess documents,
            double minScore,
            HybridEvidenceRetriever hybrid) {
        this.retriever = retriever;
        this.documents = documents;
        this.minScore = minScore;
        this.hybrid = hybrid;
    }

    public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
        return retrieve(spaceId, query, limit, RetrievalStrategy.VECTOR);
    }

    public List<RetrievedEvidence> retrieve(
            String spaceId, String query, int limit, RetrievalStrategy strategy) {
        return execute(spaceId, query, limit, strategy).results();
    }

    public RetrievalExecution execute(
            String spaceId, String query, int limit, RetrievalStrategy strategy) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("query must not be blank");
        }
        if (limit < 1 || limit > 50) {
            throw new IllegalArgumentException("limit must be between 1 and 50");
        }
        RetrievalStrategy effective = strategy == null ? RetrievalStrategy.VECTOR : strategy;
        if (effective != RetrievalStrategy.VECTOR && hybrid == null) {
            throw new RetrievalUnavailableException("Hybrid retrieval is not configured");
        }
        long started = System.nanoTime();
        HybridEvidenceRetriever.HybridResult hybridResult = effective == RetrievalStrategy.VECTOR
                ? new HybridEvidenceRetriever.HybridResult(retriever.retrieve(spaceId, query.strip(), limit), 0, 0, 0)
                : hybrid.retrieveDetailed(spaceId, query.strip(), limit, effective);
        List<RetrievedEvidence> raw = hybridResult.results();
        List<RetrievedEvidence> supported = (effective == RetrievalStrategy.VECTOR ? raw.stream()
                .filter(hit -> hit.score() >= minScore) : raw.stream()).toList();
        java.util.concurrent.atomic.AtomicInteger citation = new java.util.concurrent.atomic.AtomicInteger(1);
        List<RetrievedEvidence> results = supported.stream()
                .map(hit -> {
                    LiteratureDocument document = documents.findForSpace(hit.documentId(), spaceId);
                    return new RetrievedEvidence(
                            citation.getAndIncrement(),
                            hit.passageId(), hit.documentId(), document.title(),
                            hit.pageStart(), hit.pageEnd(), hit.excerpt(), hit.score());
                })
                .toList();
        return new RetrievalExecution(results, elapsedMillis(started), hybridResult.fusionDurationMs(),
                hybridResult.rerankDurationMs(), hybridResult.candidateCount());
    }

    private static long elapsedMillis(long started) {
        return java.time.Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    public record RetrievalExecution(List<RetrievedEvidence> results, long retrievalDurationMs,
            long fusionDurationMs, long rerankDurationMs, int candidateCount) {
    }
}
