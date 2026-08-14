package com.example.literature.document;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class PageAwareTextChunker {

    private final int chunkSize;
    private final int overlap;

    public PageAwareTextChunker(int chunkSize, int overlap) {
        if (chunkSize < 1 || overlap < 0 || overlap >= chunkSize) {
            throw new IllegalArgumentException("Require chunkSize > overlap >= 0");
        }
        this.chunkSize = chunkSize;
        this.overlap = overlap;
    }

    public List<EvidencePassageDraft> chunk(UUID documentId, ParsedDocument document) {
        List<EvidencePassageDraft> passages = new ArrayList<>();
        int ordinal = 0;
        for (PageText page : document.pages()) {
            String remaining = page.text().strip();
            while (!remaining.isEmpty()) {
                int end = chooseBreak(remaining, chunkSize);
                String text = remaining.substring(0, end).strip();
                if (!text.isEmpty()) {
                    passages.add(new EvidencePassageDraft(
                            documentId, ordinal++, page.pageNumber(), page.pageNumber(), text));
                }
                if (end >= remaining.length()) {
                    break;
                }
                int nextStart = chooseOverlapStart(remaining, end, overlap);
                remaining = remaining.substring(nextStart).stripLeading();
            }
        }
        return List.copyOf(passages);
    }

    private static int chooseBreak(String text, int limit) {
        if (text.length() <= limit) {
            return text.length();
        }
        int whitespace = text.lastIndexOf(' ', limit);
        return whitespace > 0 ? whitespace : limit;
    }

    private static int chooseOverlapStart(String text, int end, int overlap) {
        int target = Math.max(0, end - overlap);
        int whitespace = text.indexOf(' ', target);
        return whitespace >= 0 && whitespace < end ? whitespace + 1 : target;
    }
}
