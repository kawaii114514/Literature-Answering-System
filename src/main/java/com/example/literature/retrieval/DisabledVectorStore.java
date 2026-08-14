package com.example.literature.retrieval;

import java.util.List;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;

public final class DisabledVectorStore implements VectorStore {

    @Override
    public void add(List<Document> documents) {
        throw unavailable();
    }

    @Override
    public void delete(List<String> ids) {
        throw unavailable();
    }

    @Override
    public void delete(Filter.Expression filterExpression) {
        throw unavailable();
    }

    @Override
    public List<Document> similaritySearch(SearchRequest request) {
        throw unavailable();
    }

    private static RetrievalUnavailableException unavailable() {
        return new RetrievalUnavailableException(
                "Vector store is not configured. Activate the 'openai' profile and start Qdrant.");
    }
}
