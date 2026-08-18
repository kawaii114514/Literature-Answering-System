package com.example.literature.answer;

import com.example.literature.retrieval.RetrievalService;
import com.example.literature.retrieval.RetrievedEvidence;
import com.example.literature.retrieval.RetrievalStrategy;
import com.example.literature.metrics.RequestTraceService;
import java.util.List;
import reactor.core.publisher.Flux;

public final class GroundedAnswerService {

    private final RetrievalService retrieval;
    private final AnswerGenerator generator;
    private final RequestTraceService traces;

    public GroundedAnswerService(RetrievalService retrieval, AnswerGenerator generator, RequestTraceService traces) {
        this.retrieval = retrieval;
        this.generator = generator;
        this.traces = traces;
    }

    public GroundedAnswer answer(String spaceId, String question, int limit) {
        return answer(spaceId, question, limit, RetrievalStrategy.VECTOR,
                com.example.literature.auth.CurrentUser.LOCAL_DEVELOPER_ID);
    }

    public GroundedAnswer answer(
            String spaceId, String question, int limit, RetrievalStrategy strategy, String userId) {
        RequestTraceService.Context trace = traces.start(userId, spaceId, strategy.name());
        AnswerRunMetrics metrics = new AnswerRunMetrics();
        try {
            var execution = retrieval.execute(spaceId, question, limit, strategy);
            List<RetrievedEvidence> citations = execution.results();
            metrics.retrieval(execution.retrievalDurationMs(), execution.fusionDurationMs(),
                    execution.rerankDurationMs(), execution.candidateCount());
            trace.trace().retrievalDuration(execution.retrievalDurationMs());
            trace.trace().fusionDuration(execution.fusionDurationMs());
            trace.trace().rerankDuration(execution.rerankDurationMs());
            trace.trace().counts(execution.candidateCount(), citations.size());
            if (citations.isEmpty()) {
                traces.finish(trace, "REFUSED");
                return new GroundedAnswer(
                        Flux.empty(), citations, true, "NO_SUPPORTING_EVIDENCE", metrics);
            }
            long modelStarted = System.nanoTime();
            Flux<String> tokens = generator.stream(question, citations, usage ->
                            {
                                trace.trace().tokens(
                                        usage.promptTokens(), usage.completionTokens(), usage.totalTokens());
                                metrics.tokens(usage);
                            })
                    .doOnComplete(() -> {
                        long duration = elapsedMillis(modelStarted);
                        trace.trace().modelDuration(duration);
                        metrics.modelDuration(duration);
                        traces.finish(trace, "ANSWERED");
                    })
                    .doOnError(error -> {
                        long duration = elapsedMillis(modelStarted);
                        trace.trace().modelDuration(duration);
                        metrics.modelDuration(duration);
                        traces.finish(trace, "FAILED");
                    });
            return new GroundedAnswer(tokens, citations, false, null, metrics);
        } catch (RuntimeException exception) {
            traces.finish(trace, "FAILED");
            throw exception;
        }
    }

    private static long elapsedMillis(long started) {
        return java.time.Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    public record GroundedAnswer(
            Flux<String> tokens,
            List<RetrievedEvidence> citations,
            boolean refused,
            String refusalReason,
            AnswerRunMetrics metrics) {
    }

    public static final class AnswerRunMetrics {
        private Long retrievalDurationMs;
        private Long fusionDurationMs;
        private Long rerankDurationMs;
        private Long modelDurationMs;
        private Long promptTokens;
        private Long completionTokens;
        private Long totalTokens;
        private Integer candidateCount;

        synchronized void retrieval(long retrieval, long fusion, long rerank, int candidates) {
            retrievalDurationMs = retrieval;
            fusionDurationMs = fusion;
            rerankDurationMs = rerank;
            candidateCount = candidates;
        }

        synchronized void modelDuration(long duration) {
            modelDurationMs = duration;
        }

        synchronized void tokens(TokenUsage usage) {
            promptTokens = usage.promptTokens();
            completionTokens = usage.completionTokens();
            totalTokens = usage.totalTokens();
        }

        public synchronized Snapshot snapshot() {
            return new Snapshot(
                    retrievalDurationMs, fusionDurationMs, rerankDurationMs, modelDurationMs,
                    promptTokens, completionTokens, totalTokens, candidateCount);
        }

        public record Snapshot(
                Long retrievalDurationMs,
                Long fusionDurationMs,
                Long rerankDurationMs,
                Long modelDurationMs,
                Long promptTokens,
                Long completionTokens,
                Long totalTokens,
                Integer candidateCount) {
        }
    }
}
