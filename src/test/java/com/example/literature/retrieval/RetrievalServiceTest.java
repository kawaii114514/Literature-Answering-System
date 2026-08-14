package com.example.literature.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.literature.document.LiteratureDocument;
import com.example.literature.document.LiteratureDocumentRepositoryAccess;
import java.util.List;
import org.junit.jupiter.api.Test;

class RetrievalServiceTest {

    @Test
    void excludesWeakMatchesAndAssignsCitationNumbersInRankOrder() {
        EvidenceRetriever adapter = (spaceId, query, limit) -> List.of(
                new RetrievedEvidence(0, "passage-1", "document-1", "", 2, 2, "Strong evidence", 0.82),
                new RetrievedEvidence(0, "passage-2", "document-1", "", 3, 3, "Weak evidence", 0.41));
        LiteratureDocument document = new LiteratureDocument("space-1", "retrieval.pdf", "path", "hash");
        document.updateMetadata("Hybrid Retrieval", null, 2024);
        LiteratureDocumentRepositoryAccess documents = (documentId, spaceId) -> document;
        RetrievalService service = new RetrievalService(adapter, documents, 0.65);

        List<RetrievedEvidence> results = service.retrieve("space-1", "How does it work?", 10);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.citationNumber()).isEqualTo(1);
            assertThat(result.documentTitle()).isEqualTo("Hybrid Retrieval");
            assertThat(result.excerpt()).isEqualTo("Strong evidence");
        });
    }
}
