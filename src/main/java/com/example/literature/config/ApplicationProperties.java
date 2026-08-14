package com.example.literature.config;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record ApplicationProperties(
        Storage storage,
        Documents documents,
        Retrieval retrieval,
        Conversation conversation,
        Auth auth,
        Reranker reranker) {

    public record Storage(Path localRoot, Path luceneRoot) {
    }

    public record Documents(long maxFileSizeBytes, int maxPages, int chunkSize, int chunkOverlap) {
    }

    public record Retrieval(double minScore, int candidateMultiplier, String defaultStrategy) {
    }

    public record Conversation(long cacheTtlMinutes) {
    }

    public record Auth(String secret, long tokenTtlSeconds, boolean required) {
    }

    public record Reranker(String baseUrl, String apiKey, String model, int timeoutMillis, boolean enabled) {
    }
}
