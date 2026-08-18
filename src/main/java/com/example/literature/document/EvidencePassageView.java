package com.example.literature.document;

public record EvidencePassageView(
        String id,
        String documentId,
        int ordinal,
        int pageStart,
        int pageEnd,
        String text) {

    static EvidencePassageView from(EvidencePassage passage) {
        return new EvidencePassageView(
                passage.id(), passage.documentId(), passage.ordinal(),
                passage.pageStart(), passage.pageEnd(), passage.text());
    }
}
