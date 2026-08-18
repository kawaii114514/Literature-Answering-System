package com.example.literature.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.literature.document.EvidencePassage;
import com.example.literature.retrieval.EvidenceIndexer;
import com.example.literature.retrieval.EvidenceRetriever;
import com.example.literature.retrieval.KeywordEvidenceIndexer;
import com.example.literature.retrieval.KeywordEvidenceRetriever;
import com.example.literature.retrieval.RetrievedEvidence;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "spring.task.execution.pool.core-size=1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentIndexLifecycleApiTest {

    private static final String DEFAULT_SPACE = "00000000-0000-0000-0000-000000000001";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private FakeIndexState indexes;

    @BeforeEach
    void resetIndexes() {
        indexes.reset();
    }

    @Test
    void partialFailureRetryAndDeleteKeepVectorAndKeywordIndexesConsistent() throws Exception {
        indexes.failNextKeywordReplace();
        Upload upload = upload("index-lifecycle.pdf");
        waitForStatus(upload.taskId(), "FAILED");

        retrieve("VECTOR", 0);
        retrieve("HYBRID_RRF", 0);

        mvc.perform(post("/api/v1/indexing-tasks/{taskId}/retry", upload.taskId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
        waitForStatus(upload.taskId(), "COMPLETED");

        retrieve("VECTOR", 1);
        retrieve("HYBRID_RRF", 1);

        mvc.perform(delete("/api/v1/spaces/{spaceId}/documents/{documentId}",
                        DEFAULT_SPACE, upload.documentId()))
                .andExpect(status().isNoContent());

        retrieve("VECTOR", 0);
        retrieve("HYBRID_RRF", 0);
    }

    private Upload upload(String filename) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", filename, "application/pdf", textPdf("retrieval lifecycle marker"));
        MvcResult result = mvc.perform(multipart("/api/v1/spaces/{spaceId}/documents", DEFAULT_SPACE)
                        .file(file))
                .andExpect(status().isAccepted())
                .andReturn();
        JsonNode body = json.readTree(result.getResponse().getContentAsByteArray());
        return new Upload(body.get("documentId").asText(), body.get("taskId").asText());
    }

    private void waitForStatus(String taskId, String expected) throws Exception {
        for (int attempt = 0; attempt < 120; attempt++) {
            MvcResult result = mvc.perform(get("/api/v1/indexing-tasks/{taskId}", taskId))
                    .andExpect(status().isOk())
                    .andReturn();
            String taskStatus = json.readTree(result.getResponse().getContentAsByteArray())
                    .get("status").asText();
            if (expected.equals(taskStatus)) {
                return;
            }
            Thread.sleep(25);
        }
        throw new AssertionError("Indexing task did not reach " + expected);
    }

    private void retrieve(String strategy, int expectedCount) throws Exception {
        mvc.perform(post("/api/v1/spaces/{spaceId}/retrieval", DEFAULT_SPACE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"lifecycle marker\",\"limit\":5,\"strategy\":\""
                                + strategy + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.citations.length()").value(expectedCount));
    }

    private static byte[] textPdf(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 720);
                content.showText(text);
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private record Upload(String documentId, String taskId) { }

    @TestConfiguration(proxyBeanMethods = false)
    static class FakeIndexConfiguration {
        @Bean
        FakeIndexState fakeIndexState() {
            return new FakeIndexState();
        }

        @Bean
        @Primary
        FakeVectorIndex fakeVectorIndex(FakeIndexState state) {
            return new FakeVectorIndex(state);
        }

        @Bean
        @Primary
        FakeKeywordIndex fakeKeywordIndex(FakeIndexState state) {
            return new FakeKeywordIndex(state);
        }
    }

    static final class FakeIndexState {
        private final Map<String, EvidencePassage> vector = new LinkedHashMap<>();
        private final Map<String, EvidencePassage> keyword = new LinkedHashMap<>();
        private boolean failKeywordReplace;

        synchronized void reset() {
            vector.clear();
            keyword.clear();
            failKeywordReplace = false;
        }

        synchronized void failNextKeywordReplace() {
            failKeywordReplace = true;
        }

        private static void replace(
                Map<String, EvidencePassage> target, String documentId, List<EvidencePassage> passages) {
            delete(target, documentId);
            passages.forEach(passage -> target.put(passage.id(), passage));
        }

        private static void delete(Map<String, EvidencePassage> target, String documentId) {
            target.values().removeIf(passage -> passage.documentId().equals(documentId));
        }

        private static List<RetrievedEvidence> hits(
                Map<String, EvidencePassage> source, String spaceId, int limit) {
            return source.values().stream()
                    .filter(passage -> passage.spaceId().equals(spaceId))
                    .limit(limit)
                    .map(passage -> new RetrievedEvidence(0, passage.id(), passage.documentId(), "",
                            passage.pageStart(), passage.pageEnd(), passage.text(), 1.0))
                    .toList();
        }
    }

    static final class FakeVectorIndex implements EvidenceIndexer, EvidenceRetriever {
        private final FakeIndexState state;

        FakeVectorIndex(FakeIndexState state) {
            this.state = state;
        }

        @Override
        public void replaceDocument(
                String spaceId, String documentId, List<EvidencePassage> passages) {
            synchronized (state) {
                FakeIndexState.replace(state.vector, documentId, passages);
            }
        }

        @Override
        public void deleteDocument(String spaceId, String documentId) {
            synchronized (state) {
                FakeIndexState.delete(state.vector, documentId);
            }
        }

        @Override
        public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
            synchronized (state) {
                return FakeIndexState.hits(state.vector, spaceId, limit);
            }
        }
    }

    static final class FakeKeywordIndex implements KeywordEvidenceIndexer, KeywordEvidenceRetriever {
        private final FakeIndexState state;

        FakeKeywordIndex(FakeIndexState state) {
            this.state = state;
        }

        @Override
        public void replaceDocument(
                String spaceId, String documentId, List<EvidencePassage> passages) {
            synchronized (state) {
                if (state.failKeywordReplace) {
                    state.failKeywordReplace = false;
                    throw new IllegalStateException("simulated keyword indexing failure");
                }
                FakeIndexState.replace(state.keyword, documentId, passages);
            }
        }

        @Override
        public void deleteDocument(String spaceId, String documentId) {
            synchronized (state) {
                FakeIndexState.delete(state.keyword, documentId);
            }
        }

        @Override
        public List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
            synchronized (state) {
                return FakeIndexState.hits(state.keyword, spaceId, limit);
            }
        }
    }
}
