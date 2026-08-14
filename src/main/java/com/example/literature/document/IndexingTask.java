package com.example.literature.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "indexing_task")
public class IndexingTask {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "document_id", nullable = false, length = 36)
    private String documentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TaskStatus status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "failure_reason", length = 2000)
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "parse_duration_ms") private Long parseDurationMs;
    @Column(name = "chunk_duration_ms") private Long chunkDurationMs;
    @Column(name = "vector_index_duration_ms") private Long vectorIndexDurationMs;
    @Column(name = "keyword_index_duration_ms") private Long keywordIndexDurationMs;
    @Column(name = "total_duration_ms") private Long totalDurationMs;
    @Column(name = "passage_count") private Integer passageCount;

    @Version
    private long version;

    protected IndexingTask() {
    }

    public IndexingTask(String documentId) {
        this.id = UUID.randomUUID().toString();
        this.documentId = documentId;
        this.status = TaskStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public void start() {
        status = TaskStatus.RUNNING;
        attemptCount++;
        failureReason = null;
        startedAt = Instant.now();
        completedAt = null;
    }

    public void complete() {
        status = TaskStatus.COMPLETED;
        completedAt = Instant.now();
    }

    public void fail(String reason) {
        status = TaskStatus.FAILED;
        failureReason = reason == null ? "Unknown indexing failure"
                : reason.substring(0, Math.min(reason.length(), 2000));
        completedAt = Instant.now();
    }

    public void metrics(long parse, long chunk, long vector, long keyword, long total, int passages) {
        this.parseDurationMs = parse;
        this.chunkDurationMs = chunk;
        this.vectorIndexDurationMs = vector;
        this.keywordIndexDurationMs = keyword;
        this.totalDurationMs = total;
        this.passageCount = passages;
    }

    public void scheduleRetry() {
        if (status != TaskStatus.FAILED) {
            throw new IllegalStateException("Only failed tasks can be retried");
        }
        status = TaskStatus.PENDING;
        failureReason = null;
        startedAt = null;
        completedAt = null;
    }

    public String id() { return id; }
    public String documentId() { return documentId; }
    public TaskStatus status() { return status; }
    public int attemptCount() { return attemptCount; }
    public String failureReason() { return failureReason; }
    public Instant createdAt() { return createdAt; }
    public Instant startedAt() { return startedAt; }
    public Instant completedAt() { return completedAt; }
    public Long parseDurationMs() { return parseDurationMs; }
    public Long chunkDurationMs() { return chunkDurationMs; }
    public Long vectorIndexDurationMs() { return vectorIndexDurationMs; }
    public Long keywordIndexDurationMs() { return keywordIndexDurationMs; }
    public Long totalDurationMs() { return totalDurationMs; }
    public Integer passageCount() { return passageCount; }
}
