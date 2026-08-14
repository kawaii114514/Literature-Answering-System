package com.example.literature.retrieval;

import java.util.List;

public interface Reranker {
    List<RetrievedEvidence> rerank(String query, List<RetrievedEvidence> candidates, int limit);
}
