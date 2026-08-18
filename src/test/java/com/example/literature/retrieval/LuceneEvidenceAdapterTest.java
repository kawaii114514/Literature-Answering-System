package com.example.literature.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.literature.config.ApplicationProperties;
import com.example.literature.document.EvidencePassage;
import com.example.literature.document.EvidencePassageDraft;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LuceneEvidenceAdapterTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void requiresEnoughQueryTermsToAvoidCommonWordFalsePositives() {
        LuceneEvidenceAdapter lucene = adapter();
        String documentId = UUID.randomUUID().toString();
        lucene.replaceDocument("space", documentId, List.of(passage(documentId,
                "This paper evaluates retrieval architectures and language model inference.")));

        assertThat(lucene.retrieve("space", "Which retrieval architectures does this paper evaluate?", 5))
                .hasSize(1);
        assertThat(lucene.retrieve("space",
                "What oven temperature and baking time makes a sourdough loaf?", 5))
                .isEmpty();
    }

    private LuceneEvidenceAdapter adapter() {
        ApplicationProperties properties = new ApplicationProperties(
                new ApplicationProperties.Storage(temporaryDirectory.resolve("uploads"), temporaryDirectory),
                null, null, null, null, null);
        return new LuceneEvidenceAdapter(properties);
    }

    private static EvidencePassage passage(String documentId, String text) {
        return new EvidencePassage("space", new EvidencePassageDraft(
                UUID.fromString(documentId), 0, 1, 1, text));
    }
}
