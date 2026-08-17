package com.example.literature.retrieval;

import com.example.literature.config.ApplicationProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public final class CohereReranker implements Reranker {

    private final RestClient client;
    private final ObjectMapper mapper;
    private final ApplicationProperties.Reranker properties;

    public CohereReranker(RestClient.Builder builder, ObjectMapper mapper, ApplicationProperties properties) {
        this.mapper = mapper;
        this.properties = properties.reranker();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(this.properties.timeoutMillis());
        factory.setReadTimeout(this.properties.timeoutMillis());
        this.client = builder.baseUrl(this.properties.baseUrl()).requestFactory(factory).build();
    }

    @Override
    public List<RetrievedEvidence> rerank(String query, List<RetrievedEvidence> candidates, int limit) {
        if (!properties.enabled() || properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new RerankingUnavailableException(
                    "Reranker is not configured; set RERANK_ENABLED and RERANK_API_KEY or SILICONFLOW_API_KEY");
        }
        try {
            List<String> documents = candidates.stream().map(RetrievedEvidence::excerpt).toList();
            String body = client.post()
                    .uri("/rerank")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .body(Map.of("model", properties.model(), "query", query,
                            "documents", documents, "top_n", Math.min(limit, documents.size()),
                            "return_documents", false))
                    .retrieve()
                    .body(String.class);
            JsonNode results = mapper.readTree(body).path("results");
            List<RetrievedEvidence> reranked = new ArrayList<>();
            for (JsonNode result : results) {
                int index = result.path("index").asInt(-1);
                if (index >= 0 && index < candidates.size()) {
                    RetrievedEvidence candidate = candidates.get(index);
                    reranked.add(new RetrievedEvidence(candidate.citationNumber(), candidate.passageId(),
                            candidate.documentId(), candidate.documentTitle(), candidate.pageStart(),
                            candidate.pageEnd(), candidate.excerpt(), result.path("relevance_score").asDouble()));
                }
            }
            return reranked.stream().sorted(Comparator.comparingDouble(RetrievedEvidence::score).reversed())
                    .limit(limit).toList();
        } catch (Exception exception) {
            throw new RerankingUnavailableException("Cohere-compatible reranker request failed", exception);
        }
    }
}
