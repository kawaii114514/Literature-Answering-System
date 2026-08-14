package com.example.literature.document;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface EvidencePassageRepository extends JpaRepository<EvidencePassage, String> {

    List<EvidencePassage> findByDocumentIdOrderByOrdinal(String documentId);

    void deleteByDocumentId(String documentId);
}

