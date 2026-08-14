package com.example.literature.document;

import com.example.literature.retrieval.EvidenceIndexer;
import com.example.literature.retrieval.KeywordEvidenceIndexer;
import java.io.IOException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentLifecycleService {

    private final LiteratureDocumentRepository documents;
    private final IndexingTaskRepository tasks;
    private final EvidencePassageRepository passages;
    private final DocumentStorage storage;
    private final EvidenceIndexer indexer;
    private final KeywordEvidenceIndexer keywordIndexer;

    public DocumentLifecycleService(
            LiteratureDocumentRepository documents,
            IndexingTaskRepository tasks,
            EvidencePassageRepository passages,
            DocumentStorage storage,
            EvidenceIndexer indexer,
            KeywordEvidenceIndexer keywordIndexer) {
        this.documents = documents;
        this.tasks = tasks;
        this.passages = passages;
        this.storage = storage;
        this.indexer = indexer;
        this.keywordIndexer = keywordIndexer;
    }

    @Transactional
    public void delete(String spaceId, String documentId) throws IOException {
        LiteratureDocument document = documents.findForSpace(documentId, spaceId);
        indexer.deleteDocument(spaceId, documentId);
        keywordIndexer.deleteDocument(spaceId, documentId);
        passages.deleteByDocumentId(documentId);
        tasks.deleteAllByDocumentId(documentId);
        documents.delete(document);
        storage.delete(document.storedPath());
    }
}
