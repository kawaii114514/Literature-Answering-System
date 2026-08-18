package com.example.literature.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Entity
@Table(name = "evidence_passage")
public class EvidencePassage {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "document_id", nullable = false, length = 36)
    private String documentId;

    @Column(name = "space_id", nullable = false, length = 36)
    private String spaceId;

    @Column(name = "ordinal_no", nullable = false)
    private int ordinal;

    @Column(name = "page_start", nullable = false)
    private int pageStart;

    @Column(name = "page_end", nullable = false)
    private int pageEnd;

    @Column(name = "passage_text", nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EvidencePassage() {
    }

    public EvidencePassage(String spaceId, EvidencePassageDraft draft) {
        this(spaceId, draft.documentId().toString(), draft);
    }

    public EvidencePassage(String spaceId, String documentSha256, EvidencePassageDraft draft) {
        this.id = stableId(spaceId, documentSha256, draft);
        this.documentId = draft.documentId().toString();
        this.spaceId = spaceId;
        this.ordinal = draft.ordinal();
        this.pageStart = draft.pageStart();
        this.pageEnd = draft.pageEnd();
        this.text = draft.text();
        this.createdAt = Instant.now();
    }

    private static String stableId(String spaceId, String documentSha256, EvidencePassageDraft draft) {
        String identity = spaceId + ":" + documentSha256 + ":" + draft.ordinal() + ":" + draft.pageStart()
                + ":" + draft.pageEnd() + ":" + draft.text();
        return UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString();
    }

    public String id() { return id; }
    public String documentId() { return documentId; }
    public String spaceId() { return spaceId; }
    public int ordinal() { return ordinal; }
    public int pageStart() { return pageStart; }
    public int pageEnd() { return pageEnd; }
    public String text() { return text; }
}
