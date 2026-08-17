package com.example.literature.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.literature.config.ApplicationProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class CohereRerankerTest {

    @Test
    void sendsCohereCompatibleRequestAndMapsSiliconFlowResults() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        AtomicReference<String> requestBody = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/rerank", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] response = "{\"results\":[{\"index\":1,\"relevance_score\":0.91},{\"index\":0,\"relevance_score\":0.42}]}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            try (var output = exchange.getResponseBody()) {
                output.write(response);
            }
        });
        server.start();
        try {
            ApplicationProperties properties = properties(
                    "http://localhost:" + server.getAddress().getPort(), "siliconflow-key", true);
            CohereReranker reranker = new CohereReranker(RestClient.builder(), mapper, properties);

            List<RetrievedEvidence> results = reranker.rerank("query", List.of(
                    evidence("first", "first passage"), evidence("second", "second passage")), 2);

            assertThat(results).extracting(RetrievedEvidence::passageId)
                    .containsExactly("second", "first");
            assertThat(results).extracting(RetrievedEvidence::score)
                    .containsExactly(0.91, 0.42);
            assertThat(authorization.get()).isEqualTo("Bearer siliconflow-key");
            JsonNode request = mapper.readTree(requestBody.get());
            assertThat(request.path("model").asText()).isEqualTo("test-reranker");
            assertThat(request.path("query").asText()).isEqualTo("query");
            assertThat(request.path("documents").size()).isEqualTo(2);
            assertThat(request.path("top_n").asInt()).isEqualTo(2);
            assertThat(request.path("return_documents").asBoolean()).isFalse();
        } finally {
            server.stop(0);
        }
    }

    private static RetrievedEvidence evidence(String id, String excerpt) {
        return new RetrievedEvidence(0, id, "document", "title", 1, 1, excerpt, 0.1);
    }

    private static ApplicationProperties properties(String baseUrl, String apiKey, boolean enabled) {
        return new ApplicationProperties(
                new ApplicationProperties.Storage(Path.of("target/uploads"), Path.of("target/lucene")),
                new ApplicationProperties.Documents(50_000_000, 500, 1200, 200),
                new ApplicationProperties.Retrieval(0.65, 4, "HYBRID_RRF"),
                new ApplicationProperties.Conversation(30),
                new ApplicationProperties.Auth("test-secret-that-is-at-least-32-bytes-long", 3600, false),
                new ApplicationProperties.Reranker(baseUrl, apiKey, "test-reranker", 1000, enabled));
    }
}
