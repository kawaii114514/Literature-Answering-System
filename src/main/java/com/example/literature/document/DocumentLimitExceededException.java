package com.example.literature.document;

public final class DocumentLimitExceededException extends RuntimeException {

    public DocumentLimitExceededException(String message) {
        super(message);
    }
}

