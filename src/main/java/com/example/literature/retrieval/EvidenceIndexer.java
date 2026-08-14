package com.example.literature.retrieval;

import com.example.literature.document.EvidencePassage;
import java.util.List;

public interface EvidenceIndexer {

    void replaceDocument(String spaceId, String documentId, List<EvidencePassage> passages);

    void deleteDocument(String spaceId, String documentId);
}

