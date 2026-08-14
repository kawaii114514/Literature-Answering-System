package com.example.literature.document;

public final class DuplicateDocumentException extends RuntimeException {

    private final String existingDocumentId;

    public DuplicateDocumentException(String existingDocumentId) {
        super("The same PDF already exists in this Knowledge Space: " + existingDocumentId);
        this.existingDocumentId = existingDocumentId;
    }

    public String existingDocumentId() {
        return existingDocumentId;
    }
}
