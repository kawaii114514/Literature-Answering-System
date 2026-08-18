package com.example.literature.document;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentQueryService {

    private final LiteratureDocumentRepository documents;
    private final EvidencePassageRepository passages;

    public DocumentQueryService(
            LiteratureDocumentRepository documents,
            EvidencePassageRepository passages) {
        this.documents = documents;
        this.passages = passages;
    }

    @Transactional(readOnly = true)
    public DocumentView find(String spaceId, String documentId) {
        return DocumentView.from(documents.findForSpace(documentId, spaceId));
    }

    @Transactional(readOnly = true)
    public List<EvidencePassageView> passages(String spaceId, String documentId) {
        documents.findForSpace(documentId, spaceId);
        return passages.findByDocumentIdOrderByOrdinal(documentId).stream()
                .map(EvidencePassageView::from)
                .toList();
    }

    @Transactional
    public DocumentView updateMetadata(String spaceId, String documentId, UpdateDocumentMetadata command) {
        LiteratureDocument document = documents.findForSpace(documentId, spaceId);
        document.updateMetadata(command.title(), command.authors(), command.publicationYear());
        return DocumentView.from(documents.save(document));
    }
}
