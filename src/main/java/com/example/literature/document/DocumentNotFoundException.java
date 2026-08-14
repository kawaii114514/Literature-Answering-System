package com.example.literature.document;

public final class DocumentNotFoundException extends RuntimeException {

    public DocumentNotFoundException(String documentId) {
        super("Literature document not found: " + documentId);
    }
}
