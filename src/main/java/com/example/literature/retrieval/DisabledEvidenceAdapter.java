package com.example.literature.retrieval;

import com.example.literature.document.EvidencePassage;
import java.util.List;

public final class DisabledEvidenceAdapter implements EvidenceIndexer, EvidenceRetriever {

    private static final String MESSAGE =
            "Embedding/vector provider is not configured. Activate the 'openai' profile and set OPENAI_API_KEY.";

    @Override
    public void replaceDocument(String spaceId, String documentId, List<EvidencePassage> passages) {
        throw new RetrievalUnavailableException(MESSAGE);
    }

    @Override
    public void deleteDocument(String spaceId, String documentId) {
        // No external index exists in disabled mode.
    }

    @Override
    public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
        throw new RetrievalUnavailableException(MESSAGE);
    }
}

