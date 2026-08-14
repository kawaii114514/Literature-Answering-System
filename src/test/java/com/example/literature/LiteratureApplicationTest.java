package com.example.literature;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.literature.retrieval.EvidenceRetriever;
import com.example.literature.retrieval.RetrievalUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class LiteratureApplicationTest {

    @Autowired
    EvidenceRetriever evidenceRetriever;

    @Test
    void startsWithoutExternalModelCredentialsAndExplainsUnavailableRetrieval() {
        assertThat(evidenceRetriever).isNotNull();
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> evidenceRetriever.retrieve(
                                "00000000-0000-0000-0000-000000000001", "What is RAG?", 5))
                .isInstanceOf(RetrievalUnavailableException.class)
                .hasMessageContaining("OPENAI_API_KEY");
    }
}
