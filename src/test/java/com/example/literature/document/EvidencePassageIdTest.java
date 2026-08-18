package com.example.literature.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class EvidencePassageIdTest {

    @Test
    void keepsPassageIdStableWhenTheSamePdfIsReindexed() {
        EvidencePassageDraft draft = new EvidencePassageDraft(
                UUID.randomUUID(), 3, 7, 7, "A stable evidence excerpt.");

        EvidencePassage first = new EvidencePassage("space-a", "paper-sha-256", draft);
        EvidencePassage retried = new EvidencePassage("space-a", "paper-sha-256", draft);

        assertThat(retried.id()).isEqualTo(first.id());
    }

    @Test
    void changesPassageIdWhenChunkContentChanges() {
        UUID documentId = UUID.randomUUID();
        EvidencePassage original = new EvidencePassage("space-a", "paper-sha-256",
                new EvidencePassageDraft(documentId, 3, 7, 7, "Original excerpt."));
        EvidencePassage changed = new EvidencePassage("space-a", "paper-sha-256",
                new EvidencePassageDraft(documentId, 3, 7, 7, "Changed excerpt."));

        assertThat(changed.id()).isNotEqualTo(original.id());
    }

    @Test
    void namespacesPassageIdBySpaceToPreventCrossSpacePrimaryKeyCollisions() {
        EvidencePassageDraft draft = new EvidencePassageDraft(
                UUID.randomUUID(), 0, 1, 1, "Shared paper excerpt.");

        EvidencePassage firstSpace = new EvidencePassage("space-a", "paper-sha-256", draft);
        EvidencePassage secondSpace = new EvidencePassage("space-b", "paper-sha-256", draft);

        assertThat(secondSpace.id()).isNotEqualTo(firstSpace.id());
    }
}
