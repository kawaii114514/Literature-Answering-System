package com.example.literature.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "literature_document")
public class LiteratureDocument {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "space_id", nullable = false, length = 36)
    private String spaceId;

    @Column(name = "original_filename", nullable = false, length = 500)
    private String originalFilename;

    @Column(name = "stored_path", nullable = false, length = 1000)
    private String storedPath;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 1000)
    private String authors;

    @Column(name = "publication_year")
    private Integer publicationYear;

    @Column(name = "page_count")
    private Integer pageCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentStatus status;

    @Column(name = "failure_reason", length = 2000)
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected LiteratureDocument() {
    }

    public LiteratureDocument(String spaceId, String originalFilename, String storedPath, String sha256) {
        this(UUID.randomUUID().toString(), spaceId, originalFilename, storedPath, sha256);
    }

    LiteratureDocument(String id, String spaceId, String originalFilename, String storedPath, String sha256) {
        this.id = id;
        this.spaceId = spaceId;
        this.originalFilename = originalFilename;
        this.storedPath = storedPath;
        this.sha256 = sha256;
        this.title = titleFrom(originalFilename);
        this.status = DocumentStatus.PENDING;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void markProcessing() {
        status = DocumentStatus.PROCESSING;
        failureReason = null;
        updatedAt = Instant.now();
    }

    public void markReady(int pageCount) {
        this.pageCount = pageCount;
        status = DocumentStatus.READY;
        failureReason = null;
        updatedAt = Instant.now();
    }

    public void markFailed(String reason) {
        status = DocumentStatus.FAILED;
        failureReason = truncate(reason);
        updatedAt = Instant.now();
    }

    public void updateMetadata(String title, String authors, Integer publicationYear) {
        if (title != null && !title.isBlank()) {
            this.title = title.strip();
        }
        this.authors = blankToNull(authors);
        this.publicationYear = publicationYear;
        updatedAt = Instant.now();
    }

    public String id() { return id; }
    public String spaceId() { return spaceId; }
    public String originalFilename() { return originalFilename; }
    public String storedPath() { return storedPath; }
    public String sha256() { return sha256; }
    public String title() { return title; }
    public String authors() { return authors; }
    public Integer publicationYear() { return publicationYear; }
    public Integer pageCount() { return pageCount; }
    public DocumentStatus status() { return status; }
    public String failureReason() { return failureReason; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }

    private static String titleFrom(String filename) {
        return filename.toLowerCase().endsWith(".pdf")
                ? filename.substring(0, filename.length() - 4)
                : filename;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String truncate(String value) {
        if (value == null || value.isBlank()) {
            return "Unknown indexing failure";
        }
        return value.length() <= 2000 ? value : value.substring(0, 2000);
    }
}
