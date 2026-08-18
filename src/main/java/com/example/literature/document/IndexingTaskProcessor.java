package com.example.literature.document;

import com.example.literature.retrieval.EvidenceIndexer;
import com.example.literature.retrieval.KeywordEvidenceIndexer;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IndexingTaskProcessor {

    private final IndexingTaskRepository tasks;
    private final LiteratureDocumentRepository documents;
    private final EvidencePassageRepository passages;
    private final DocumentStorage storage;
    private final DocumentParser parser;
    private final PageAwareTextChunker chunker;
    private final EvidenceIndexer indexer;
    private final KeywordEvidenceIndexer keywordIndexer;
    private final MeterRegistry meters;

    public IndexingTaskProcessor(
            IndexingTaskRepository tasks,
            LiteratureDocumentRepository documents,
            EvidencePassageRepository passages,
            DocumentStorage storage,
            DocumentParser parser,
            PageAwareTextChunker chunker,
            EvidenceIndexer indexer,
            KeywordEvidenceIndexer keywordIndexer,
            MeterRegistry meters) {
        this.tasks = tasks;
        this.documents = documents;
        this.passages = passages;
        this.storage = storage;
        this.parser = parser;
        this.chunker = chunker;
        this.indexer = indexer;
        this.keywordIndexer = keywordIndexer;
        this.meters = meters;
    }

    @Transactional
    public void process(String taskId) {
        IndexingTask task = tasks.findById(taskId)
                .orElseThrow(() -> new IndexingTaskNotFoundException(taskId));
        LiteratureDocument document = documents.findById(task.documentId())
                .orElseThrow(() -> new DocumentNotFoundException(task.documentId()));
        long totalStart = System.nanoTime();
        long parseMs = 0;
        long chunkMs = 0;
        long vectorMs = 0;
        long keywordMs = 0;
        int passageCount = 0;
        try {
            task.start();
            document.markProcessing();
            Path path = storage.resolve(document.storedPath());
            long stage = System.nanoTime();
            ParsedDocument parsed = parser.parse(path);
            parseMs = elapsedMillis(stage);
            recordStageTimer("literature.indexing.parse.duration", parseMs);
            if (parsed.title() != null || parsed.authors() != null || parsed.publicationYear() != null) {
                document.updateMetadata(parsed.title(), parsed.authors(), parsed.publicationYear());
            }
            stage = System.nanoTime();
            List<EvidencePassage> storedPassages = chunker.chunk(UUID.fromString(document.id()), parsed).stream()
                    .map(draft -> new EvidencePassage(document.spaceId(), document.sha256(), draft))
                    .toList();
            chunkMs = elapsedMillis(stage);
            recordStageTimer("literature.indexing.chunk.duration", chunkMs);
            passageCount = storedPassages.size();
            if (storedPassages.isEmpty()) {
                throw new InvalidPdfException(
                        "PDF contains no extractable text; scanned PDFs require OCR, which is not enabled in the MVP");
            }
            passages.deleteByDocumentId(document.id());
            passages.flush();
            passages.saveAll(storedPassages);
            stage = System.nanoTime();
            indexer.replaceDocument(document.spaceId(), document.id(), storedPassages);
            vectorMs = elapsedMillis(stage);
            recordStageTimer("literature.indexing.vector.duration", vectorMs);
            stage = System.nanoTime();
            keywordIndexer.replaceDocument(document.spaceId(), document.id(), storedPassages);
            keywordMs = elapsedMillis(stage);
            recordStageTimer("literature.indexing.keyword.duration", keywordMs);
            document.markReady(parsed.pageCount());
            task.metrics(parseMs, chunkMs, vectorMs, keywordMs, elapsedMillis(totalStart), passageCount);
            task.complete();
            recordTimer("COMPLETED", totalStart);
        } catch (Exception exception) {
            String reason = rootMessage(exception);
            Exception cleanupFailure = cleanupIndexes(document.spaceId(), document.id());
            if (cleanupFailure != null) {
                reason = reason + "; index cleanup failed: " + rootMessage(cleanupFailure);
            }
            document.markFailed(reason);
            task.metrics(parseMs, chunkMs, vectorMs, keywordMs, elapsedMillis(totalStart), passageCount);
            task.fail(reason);
            recordTimer("FAILED", totalStart);
        }
    }

    private Exception cleanupIndexes(String spaceId, String documentId) {
        Exception failure = null;
        try {
            indexer.deleteDocument(spaceId, documentId);
        } catch (Exception exception) {
            failure = exception;
        }
        try {
            keywordIndexer.deleteDocument(spaceId, documentId);
        } catch (Exception exception) {
            if (failure == null) {
                failure = exception;
            } else {
                failure.addSuppressed(exception);
            }
        }
        return failure;
    }

    private static long elapsedMillis(long started) {
        return java.time.Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    private void recordTimer(String outcome, long started) {
        meters.timer("literature.indexing.duration", "outcome", outcome)
                .record(System.nanoTime() - started, java.util.concurrent.TimeUnit.NANOSECONDS);
    }

    private void recordStageTimer(String meterName, long durationMs) {
        meters.timer(meterName).record(durationMs, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    private static String rootMessage(Exception exception) {
        Throwable root = exception;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        return root.getMessage() == null ? root.getClass().getSimpleName() : root.getMessage();
    }
}
