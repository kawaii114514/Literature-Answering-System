package com.example.literature.document;

import com.example.literature.config.ApplicationProperties;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentUploadService {

    private final LiteratureDocumentRepository documents;
    private final IndexingTaskRepository tasks;
    private final KnowledgeSpaceRepository spaces;
    private final DocumentStorage storage;
    private final ApplicationEventPublisher events;
    private final long maxFileSize;

    public DocumentUploadService(
            LiteratureDocumentRepository documents,
            IndexingTaskRepository tasks,
            KnowledgeSpaceRepository spaces,
            DocumentStorage storage,
            ApplicationEventPublisher events,
            ApplicationProperties properties) {
        this.documents = documents;
        this.tasks = tasks;
        this.spaces = spaces;
        this.storage = storage;
        this.events = events;
        this.maxFileSize = properties.documents().maxFileSizeBytes();
    }

    @Transactional
    public DocumentUploadResult upload(String spaceId, MultipartFile file) throws IOException {
        if (!spaces.existsById(spaceId)) {
            throw new KnowledgeSpaceNotFoundException(spaceId);
        }
        String filename = file.getOriginalFilename() == null ? "document.pdf" : file.getOriginalFilename();
        if (file.isEmpty()) {
            throw new InvalidPdfException("PDF must not be empty");
        }
        if (file.getSize() > maxFileSize) {
            throw new DocumentLimitExceededException("PDF exceeds the 50 MB limit");
        }
        byte[] bytes = file.getBytes();
        validatePdf(filename, bytes);
        String hash = sha256(bytes);
        documents.findBySpaceIdAndSha256(spaceId, hash)
                .ifPresent(existing -> { throw new DuplicateDocumentException(existing.id()); });

        String documentId = UUID.randomUUID().toString();
        String storageKey = storage.store(spaceId, documentId, filename, new ByteArrayInputStream(bytes));
        LiteratureDocument document = new LiteratureDocument(documentId, spaceId, filename, storageKey, hash);
        documents.save(document);
        IndexingTask task = tasks.save(new IndexingTask(document.id()));
        events.publishEvent(new DocumentUploadedEvent(task.id()));
        return new DocumentUploadResult(document.id(), task.id(), document.status(), task.status());
    }

    private static void validatePdf(String filename, byte[] bytes) {
        if (!filename.toLowerCase().endsWith(".pdf")) {
            throw new InvalidPdfException("Only .pdf files are accepted");
        }
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D'
                || bytes[3] != 'F' || bytes[4] != '-') {
            throw new InvalidPdfException("File does not contain a PDF signature");
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
