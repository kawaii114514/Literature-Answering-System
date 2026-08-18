package com.example.literature.retrieval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.literature.document.EvidencePassage;
import com.example.literature.document.EvidencePassageDraft;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

class QdrantEvidenceAdapterTest {

    @Test
    void namespacesVectorPointIdsBySpaceAndPreservesPassageIdMetadata() {
        VectorStore store = mock(VectorStore.class);
        QdrantEvidenceAdapter adapter = new QdrantEvidenceAdapter(store);
        String documentId = UUID.randomUUID().toString();
        EvidencePassage passage = new EvidencePassage("space-a", "paper-sha",
                new EvidencePassageDraft(UUID.fromString(documentId), 0, 1, 1, "shared passage"));

        adapter.replaceDocument("space-a", documentId, List.of(passage));
        adapter.replaceDocument("space-b", documentId, List.of(passage));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Document>> added = ArgumentCaptor.forClass(List.class);
        verify(store, org.mockito.Mockito.times(2)).add(added.capture());
        Document first = added.getAllValues().get(0).get(0);
        Document second = added.getAllValues().get(1).get(0);
        assertThat(first.getId()).isNotEqualTo(second.getId());
        assertThat(first.getMetadata().get("passageId")).isEqualTo(passage.id());
        assertThat(second.getMetadata().get("passageId")).isEqualTo(passage.id());
    }

    @Test
    void returnsPassageIdFromMetadataInsteadOfInternalPointId() {
        VectorStore store = mock(VectorStore.class);
        Document hit = Document.builder()
                .id(UUID.randomUUID().toString())
                .text("evidence")
                .metadata("passageId", "stable-passage-id")
                .metadata("documentId", UUID.randomUUID().toString())
                .metadata("pageStart", 2)
                .metadata("pageEnd", 3)
                .score(0.9)
                .build();
        when(store.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(hit));

        List<RetrievedEvidence> results = new QdrantEvidenceAdapter(store)
                .retrieve("space-a", "query", 5);

        assertThat(results).singleElement()
                .extracting(RetrievedEvidence::passageId)
                .isEqualTo("stable-passage-id");
    }
}
