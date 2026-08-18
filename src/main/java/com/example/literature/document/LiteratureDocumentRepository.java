package com.example.literature.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiteratureDocumentRepository extends JpaRepository<LiteratureDocument, String>, LiteratureDocumentRepositoryAccess {

    Optional<LiteratureDocument> findBySpaceIdAndSha256(String spaceId, String sha256);

    Optional<LiteratureDocument> findByIdAndSpaceId(String id, String spaceId);

    List<LiteratureDocument> findBySpaceIdOrderByCreatedAtDesc(String spaceId);

    @Override
    default LiteratureDocument findForSpace(String documentId, String spaceId) {
        return findByIdAndSpaceId(documentId, spaceId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
    }
}
