package com.example.literature.metrics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "request_trace")
public class RequestTrace {

    @Id
    @Column(length = 36)
    private String id;
    @Column(name = "user_id", length = 36)
    private String userId;
    @Column(name = "space_id", nullable = false, length = 36)
    private String spaceId;
    @Column(nullable = false, length = 30)
    private String strategy;
    @Column(nullable = false, length = 30)
    private String outcome;
    @Column(name = "retrieval_duration_ms") private Long retrievalDurationMs;
    @Column(name = "fusion_duration_ms") private Long fusionDurationMs;
    @Column(name = "rerank_duration_ms") private Long rerankDurationMs;
    @Column(name = "model_duration_ms") private Long modelDurationMs;
    @Column(name = "prompt_tokens") private Long promptTokens;
    @Column(name = "completion_tokens") private Long completionTokens;
    @Column(name = "total_tokens") private Long totalTokens;
    @Column(name = "candidate_count") private Integer candidateCount;
    @Column(name = "result_count") private Integer resultCount;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected RequestTrace() {
    }

    public RequestTrace(String userId, String spaceId, String strategy) {
        this.id = UUID.randomUUID().toString();
        this.userId = userId;
        this.spaceId = spaceId;
        this.strategy = strategy;
        this.outcome = "RUNNING";
        this.createdAt = Instant.now();
    }

    public void complete(String outcome) { this.outcome = outcome; }
    public void retrievalDuration(long value) { this.retrievalDurationMs = value; }
    public void fusionDuration(long value) { this.fusionDurationMs = value; }
    public void rerankDuration(long value) { this.rerankDurationMs = value; }
    public void modelDuration(long value) { this.modelDurationMs = value; }
    public void tokens(Long prompt, Long completion, Long total) {
        this.promptTokens = prompt; this.completionTokens = completion; this.totalTokens = total;
    }
    public void counts(Integer candidates, Integer results) {
        this.candidateCount = candidates; this.resultCount = results;
    }

    public String strategy() { return strategy; }
}
