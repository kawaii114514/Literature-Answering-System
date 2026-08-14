package com.example.literature.document;

import java.time.Instant;

public record IndexingTaskView(
        String id,
        String documentId,
        TaskStatus status,
        int attemptCount,
        String failureReason,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        Long parseDurationMs,
        Long chunkDurationMs,
        Long vectorIndexDurationMs,
        Long keywordIndexDurationMs,
        Long totalDurationMs,
        Integer passageCount) {

    static IndexingTaskView from(IndexingTask task) {
        return new IndexingTaskView(
                task.id(), task.documentId(), task.status(), task.attemptCount(), task.failureReason(),
                task.createdAt(), task.startedAt(), task.completedAt(), task.parseDurationMs(), task.chunkDurationMs(),
                task.vectorIndexDurationMs(), task.keywordIndexDurationMs(), task.totalDurationMs(), task.passageCount());
    }
}
