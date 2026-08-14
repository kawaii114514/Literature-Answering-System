package com.example.literature.retrieval;

import java.util.List;

public interface KeywordEvidenceRetriever {
    List<RetrievedEvidence> retrieve(String spaceId, String query, int limit);
}
