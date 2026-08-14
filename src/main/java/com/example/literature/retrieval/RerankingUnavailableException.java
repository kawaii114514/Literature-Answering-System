package com.example.literature.retrieval;

public final class RerankingUnavailableException extends RuntimeException {
    public RerankingUnavailableException(String message) {
        super(message);
    }

    public RerankingUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
