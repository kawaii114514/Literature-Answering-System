package com.example.literature.retrieval;

import com.example.literature.document.EvidencePassage;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

public final class QdrantEvidenceAdapter implements EvidenceIndexer, EvidenceRetriever {

    private final VectorStore vectorStore;

    public QdrantEvidenceAdapter(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @Override
    public void replaceDocument(String spaceId, String documentId, List<EvidencePassage> passages) {
        deleteDocument(spaceId, documentId);
        vectorStore.add(passages.stream().map(passage -> Document.builder()
                .id(passage.id())
                .text(passage.text())
                .metadata(Map.of(
                        "spaceId", spaceId,
                        "documentId", documentId,
                        "pageStart", passage.pageStart(),
                        "pageEnd", passage.pageEnd()))
                .build()).toList());
    }

    @Override
    public void deleteDocument(String spaceId, String documentId) {
        vectorStore.delete("spaceId == '%s' && documentId == '%s'".formatted(escape(spaceId), escape(documentId)));
    }

    @Override
    public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
        SearchRequest request = SearchRequest.builder()
                .query(query)
                .topK(limit)
                .filterExpression("spaceId == '%s'".formatted(escape(spaceId)))
                .build();
        return vectorStore.similaritySearch(request).stream()
                .map(document -> new RetrievedEvidence(
                        0,
                        document.getId(),
                        metadataString(document, "documentId"),
                        "",
                        metadataInt(document, "pageStart"),
                        metadataInt(document, "pageEnd"),
                        document.getText(),
                        document.getScore() == null ? 0.0 : document.getScore()))
                .collect(Collectors.toList());
    }

    private static String metadataString(Document document, String key) {
        return String.valueOf(document.getMetadata().get(key));
    }

    private static int metadataInt(Document document, String key) {
        return Integer.parseInt(String.valueOf(document.getMetadata().get(key)));
    }

    private static String escape(String value) {
        return value.replace("'", "\\'");
    }
}
