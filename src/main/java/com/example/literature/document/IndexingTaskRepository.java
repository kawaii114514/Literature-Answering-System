package com.example.literature.document;

import org.springframework.data.jpa.repository.JpaRepository;

interface IndexingTaskRepository extends JpaRepository<IndexingTask, String> {

    void deleteAllByDocumentId(String documentId);
}
