package com.example.literature.document;

import java.time.Instant;

public record DocumentView(
        String id,
        String spaceId,
        String originalFilename,
        String title,
        String authors,
        Integer publicationYear,
        Integer pageCount,
        DocumentStatus status,
        String failureReason,
        Instant createdAt,
        Instant updatedAt) {

    static DocumentView from(LiteratureDocument document) {
        return new DocumentView(
                document.id(), document.spaceId(), document.originalFilename(), document.title(),
                document.authors(), document.publicationYear(), document.pageCount(), document.status(),
                document.failureReason(), document.createdAt(), document.updatedAt());
    }
}
