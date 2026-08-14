package com.example.literature.document;

public final class KnowledgeSpaceNotFoundException extends RuntimeException {

    public KnowledgeSpaceNotFoundException(String spaceId) {
        super("Knowledge Space not found: " + spaceId);
    }
}
