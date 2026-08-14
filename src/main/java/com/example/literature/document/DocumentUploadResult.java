package com.example.literature.document;

public record DocumentUploadResult(String documentId, String taskId, DocumentStatus documentStatus, TaskStatus taskStatus) {
}
