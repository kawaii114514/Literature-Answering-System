package com.example.literature.document;

public final class IndexingTaskNotFoundException extends RuntimeException {

    public IndexingTaskNotFoundException(String taskId) {
        super("Indexing task not found: " + taskId);
    }
}
