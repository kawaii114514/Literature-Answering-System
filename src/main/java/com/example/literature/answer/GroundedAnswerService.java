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
        try {
            var execution = retrieval.execute(spaceId, question, limit, strategy);
            List<RetrievedEvidence> citations = execution.results();
            trace.trace().retrievalDuration(execution.retrievalDurationMs());
            trace.trace().fusionDuration(execution.fusionDurationMs());
            trace.trace().rerankDuration(execution.rerankDurationMs());
            trace.trace().counts(execution.candidateCount(), citations.size());
            if (citations.isEmpty()) {
                traces.finish(trace, "REFUSED");
                return new GroundedAnswer(Flux.empty(), citations, true, "NO_SUPPORTING_EVIDENCE");
            }
            long modelStarted = System.nanoTime();
            Flux<String> tokens = generator.stream(question, citations, usage ->
                            trace.trace().tokens(usage.promptTokens(), usage.completionTokens(), usage.totalTokens()))
                    .doOnComplete(() -> {
                        trace.trace().modelDuration(elapsedMillis(modelStarted));
                        traces.finish(trace, "ANSWERED");
                    })
                    .doOnError(error -> {
                        trace.trace().modelDuration(elapsedMillis(modelStarted));
                        traces.finish(trace, "FAILED");
                    });
            return new GroundedAnswer(tokens, citations, false, null);
        } catch (RuntimeException exception) {
            traces.finish(trace, "FAILED");
            throw exception;
        }
    }

    private static long elapsedMillis(long started) {
        return java.time.Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    public record GroundedAnswer(
            Flux<String> tokens, List<RetrievedEvidence> citations, boolean refused, String refusalReason) {
    }
}
