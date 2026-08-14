package com.example.literature.document;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentQueryService {

    private final LiteratureDocumentRepository documents;

    public DocumentQueryService(LiteratureDocumentRepository documents) {
        this.documents = documents;
    }

    @Transactional(readOnly = true)
    public DocumentView find(String spaceId, String documentId) {
        return DocumentView.from(documents.findForSpace(documentId, spaceId));
    }

    @Transactional
    public DocumentView updateMetadata(String spaceId, String documentId, UpdateDocumentMetadata command) {
        LiteratureDocument document = documents.findForSpace(documentId, spaceId);
        document.updateMetadata(command.title(), command.authors(), command.publicationYear());
        return DocumentView.from(documents.save(document));
    }
}
