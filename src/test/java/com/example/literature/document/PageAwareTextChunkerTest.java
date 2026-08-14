package com.example.literature.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PageAwareTextChunkerTest {

    @Test
    void createsOverlappingEvidencePassagesWithoutLosingPageIdentity() {
        String text = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
        ParsedDocument parsed = new ParsedDocument(List.of(new PageText(7, text)));
        PageAwareTextChunker chunker = new PageAwareTextChunker(32, 8);

        List<EvidencePassageDraft> passages = chunker.chunk(UUID.randomUUID(), parsed);

        assertThat(passages).hasSizeGreaterThan(1);
        assertThat(passages).allSatisfy(passage -> {
            assertThat(passage.pageStart()).isEqualTo(7);
            assertThat(passage.pageEnd()).isEqualTo(7);
            assertThat(passage.text()).isNotBlank();
        });
        assertThat(passages).extracting(EvidencePassageDraft::ordinal)
                .containsExactly(0, 1, 2);
        assertThat(passages.get(0).text()).endsWith("epsilon");
        assertThat(passages.get(1).text()).startsWith("epsilon");
    }
}
