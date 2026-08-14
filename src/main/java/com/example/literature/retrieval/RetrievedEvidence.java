package com.example.literature.retrieval;

public record RetrievedEvidence(
        int citationNumber,
        String passageId,
        String documentId,
        String documentTitle,
        int pageStart,
        int pageEnd,
        String excerpt,
        double score) {
}
