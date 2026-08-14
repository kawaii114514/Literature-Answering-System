package com.example.literature.document;

public interface LiteratureDocumentRepositoryAccess {

    LiteratureDocument findForSpace(String documentId, String spaceId);
}
