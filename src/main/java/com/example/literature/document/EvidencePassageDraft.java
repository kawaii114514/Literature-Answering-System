package com.example.literature.document;

import java.util.UUID;

public record EvidencePassageDraft(
        UUID documentId,
        int ordinal,
        int pageStart,
        int pageEnd,
        String text) {
}

